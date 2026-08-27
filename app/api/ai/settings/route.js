import { validateAIModelId, validateAnthropicApiKey } from "@/lib/ai-config";
import { aiEmpty, aiError, aiJson, readAIJson } from "@/lib/ai-http";
import {
  consumeAIQuota,
  deleteStoredAICredential,
  getAISettings,
  getStoredAICredential,
  storeAICredential,
  updateStoredAIModel,
} from "@/lib/ai-settings-server";
import { AnthropicError, listAnthropicModels } from "@/lib/anthropic";
import { RequestAuthError, requireSupabaseUser } from "@/lib/server-auth";

function knownModel(models, modelId) {
  return models.some((model) => model.id === modelId);
}

function handledError(error) {
  if (error instanceof RequestAuthError || error instanceof AnthropicError) {
    return aiError(error.code, error.status);
  }
  if (error?.code && error?.status) return aiError(error.code, error.status);
  return aiError("AI_STORAGE_UNAVAILABLE", 503);
}

export async function GET(request) {
  try {
    const user = await requireSupabaseUser(request);
    return aiJson(await getAISettings(user.id));
  } catch (error) {
    return handledError(error);
  }
}

export async function PUT(request) {
  try {
    const user = await requireSupabaseUser(request);
    const payload = await readAIJson(request);
    const modelValidation = validateAIModelId(payload.modelId);
    if (!modelValidation.valid) return aiError(modelValidation.code, 400);

    const hasNewKey = typeof payload.apiKey === "string" && payload.apiKey.trim();
    const keyValidation = hasNewKey
      ? validateAnthropicApiKey(payload.apiKey)
      : null;
    if (keyValidation && !keyValidation.valid) {
      return aiError(keyValidation.code, 400);
    }

    const stored = keyValidation ? null : await getStoredAICredential(user.id);
    const apiKey = keyValidation?.key || stored?.apiKey;
    if (!apiKey) return aiError("AI_KEY_REQUIRED", 400);

    const quota = await consumeAIQuota(user.id);
    if (!quota.allowed) {
      const retryAfter = Math.max(
        1,
        Math.ceil((new Date(quota.resetAt).getTime() - Date.now()) / 1000),
      );
      return aiError("AI_RATE_LIMITED", 429, { "Retry-After": String(retryAfter) });
    }

    const models = await listAnthropicModels({ apiKey });
    if (!knownModel(models, modelValidation.modelId)) {
      return aiError("AI_MODEL_UNAVAILABLE", 422);
    }

    if (keyValidation) {
      await storeAICredential(user.id, keyValidation.key, modelValidation.modelId);
    } else {
      await updateStoredAIModel(user.id, modelValidation.modelId);
    }

    return aiJson({
      configured: true,
      provider: "anthropic",
      modelId: modelValidation.modelId,
    });
  } catch (error) {
    return handledError(error);
  }
}

export async function DELETE(request) {
  try {
    const user = await requireSupabaseUser(request);
    await deleteStoredAICredential(user.id);
    return aiEmpty();
  } catch (error) {
    return handledError(error);
  }
}
