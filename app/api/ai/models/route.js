import { ANTHROPIC_KEY_HEADER, validateAnthropicApiKey } from "@/lib/ai-config";
import { aiError, aiJson } from "@/lib/ai-http";
import { consumeAIQuota, getStoredAICredential } from "@/lib/ai-settings-server";
import { AnthropicError, listAnthropicModels } from "@/lib/anthropic";
import { RequestAuthError, requireSupabaseUser } from "@/lib/server-auth";

export async function POST(request) {
  try {
    const user = await requireSupabaseUser(request);
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

    const quota = await consumeAIQuota(user.id);
    if (!quota.allowed) {
      const retryAfter = Math.max(
        1,
        Math.ceil((new Date(quota.resetAt).getTime() - Date.now()) / 1000),
      );
      return aiError("AI_RATE_LIMITED", 429, { "Retry-After": String(retryAfter) });
    }

    const models = await listAnthropicModels({ apiKey });
    return aiJson({
      models,
      source: keyValidation ? "session" : "stored",
      selectedModelId: keyValidation ? null : stored.modelId,
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
