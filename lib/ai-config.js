export const ANTHROPIC_API_BASE_URL = "https://api.anthropic.com/v1";
export const ANTHROPIC_API_VERSION = "2023-06-01";
export const ANTHROPIC_KEY_HEADER = "x-capsule-anthropic-key";
export const AI_INPUT_LIMITS = Object.freeze({ title: 500, content: 20000 });
export const AI_RATE_LIMIT = Object.freeze({ requests: 10, windowSeconds: 60 });

const MODEL_ID_PATTERN = /^claude-[a-z0-9][a-z0-9._-]{1,126}$/;

export function validateAnthropicApiKey(value) {
  const key = typeof value === "string" ? value.trim() : "";
  const hasUnsafeCharacters = /[\s\u0000-\u001f\u007f]/.test(key);

  if (!key) return { valid: false, code: "AI_KEY_REQUIRED" };
  if (
    key.length < 20 ||
    key.length > 256 ||
    !key.startsWith("sk-ant-") ||
    hasUnsafeCharacters
  ) {
    return { valid: false, code: "AI_KEY_INVALID_FORMAT" };
  }

  return { valid: true, key };
}

export function validateAIModelId(value) {
  const modelId = typeof value === "string" ? value.trim() : "";
  if (!MODEL_ID_PATTERN.test(modelId)) {
    return { valid: false, code: "AI_MODEL_INVALID" };
  }
  return { valid: true, modelId };
}

export function sanitizeAnthropicModels(payload) {
  const models = Array.isArray(payload?.data) ? payload.data : [];
  const unique = new Map();

  for (const model of models) {
    const validation = validateAIModelId(model?.id);
    if (!validation.valid || unique.has(validation.modelId)) continue;
    unique.set(validation.modelId, {
      id: validation.modelId,
      displayName: typeof model.display_name === "string" && model.display_name.trim()
        ? model.display_name.trim().slice(0, 120)
        : validation.modelId,
      createdAt: typeof model.created_at === "string" ? model.created_at : null,
      maxInputTokens: Number.isFinite(model.max_input_tokens)
        ? model.max_input_tokens
        : null,
      maxTokens: Number.isFinite(model.max_tokens) ? model.max_tokens : null,
    });
  }

  return [...unique.values()];
}

export function chooseDefaultAIModel(models, currentModelId = "") {
  if (!Array.isArray(models) || models.length === 0) return "";
  if (models.some((model) => model.id === currentModelId)) return currentModelId;
  return models.find((model) => /sonnet/i.test(model.displayName))?.id
    || models.find((model) => /haiku/i.test(model.displayName))?.id
    || models[0].id;
}

export function normalizeSummaryText(value) {
  return String(value || "")
    .replace(/\*\*/g, "")
    .replace(/^résumé\s*:\s*/i, "")
    .trim();
}
