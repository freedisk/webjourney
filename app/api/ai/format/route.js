// Mise en forme IA : aperçu borné, BYOK serveur et références privées masquées.
import {
  AI_INPUT_LIMITS,
  ANTHROPIC_KEY_HEADER,
  validateAIModelId,
  validateAnthropicApiKey,
} from "@/lib/ai-config";
import {
  containsFormattableText,
  containsMalformedPrivateImageReference,
} from "@/lib/ai-formatting";
import { aiError, aiJson, readAIJson } from "@/lib/ai-http";
import { consumeAIQuota, getStoredAICredential } from "@/lib/ai-settings-server";
import { AnthropicError, createAnthropicFormatting } from "@/lib/anthropic";
import { RequestAuthError, requireSupabaseUser } from "@/lib/server-auth";

export async function POST(request) {
  try {
    const user = await requireSupabaseUser(request);
    const payload = await readAIJson(request);
    const content = typeof payload.contenu === "string" ? payload.contenu : "";

    if (containsMalformedPrivateImageReference(content)) {
      return aiError("AI_FORMAT_IMAGE_REFERENCE_INVALID", 400);
    }
    if (!containsFormattableText(content)) {
      return aiError("AI_FORMAT_CONTENT_REQUIRED", 400);
    }
    if (content.length > AI_INPUT_LIMITS.content) {
      return aiError("AI_FORMAT_CONTENT_TOO_LONG", 413);
    }

    const providedKey = request.headers.get(ANTHROPIC_KEY_HEADER) || "";
    const keyValidation = providedKey
      ? validateAnthropicApiKey(providedKey)
      : null;
    if (keyValidation && !keyValidation.valid) {
      return aiError(keyValidation.code, 400);
    }

    const stored = keyValidation ? null : await getStoredAICredential(user.id);
    const apiKey = keyValidation?.key || stored?.apiKey;
    if (!apiKey) return aiError("AI_CONFIGURATION_REQUIRED", 428);

    const modelValidation = validateAIModelId(
      keyValidation ? payload.modelId : stored.modelId,
    );
    if (!modelValidation.valid) return aiError(modelValidation.code, 400);

    const quota = await consumeAIQuota(user.id);
    if (!quota.allowed) {
      const retryAfter = Math.max(
        1,
        Math.ceil((new Date(quota.resetAt).getTime() - Date.now()) / 1000),
      );
      return aiError("AI_RATE_LIMITED", 429, { "Retry-After": String(retryAfter) });
    }

    const formattedContent = await createAnthropicFormatting({
      apiKey,
      modelId: modelValidation.modelId,
      content,
    });

    return aiJson({
      formattedContent,
      modelId: modelValidation.modelId,
      quota: { remaining: quota.remaining, resetAt: quota.resetAt },
    });
  } catch (error) {
    if (error instanceof RequestAuthError || error instanceof AnthropicError) {
      const headers = error.retryAfter ? { "Retry-After": error.retryAfter } : {};
      return aiError(error.code, error.status, headers);
    }
    if (error?.code && error?.status) return aiError(error.code, error.status);
    return aiError("AI_PROVIDER_ERROR", 500);
  }
}
