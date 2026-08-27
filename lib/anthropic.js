import {
  ANTHROPIC_API_BASE_URL,
  ANTHROPIC_API_VERSION,
  normalizeSummaryText,
  sanitizeAnthropicModels,
  validateAIModelId,
  validateAnthropicApiKey,
} from "./ai-config.js";

export class AnthropicError extends Error {
  constructor(code, status, retryAfter = null) {
    super(code);
    this.name = "AnthropicError";
    this.code = code;
    this.status = status;
    this.retryAfter = retryAfter;
  }
}

function providerError(response) {
  if (response.status === 401 || response.status === 403) {
    return new AnthropicError("AI_KEY_REJECTED", 422);
  }
  if (response.status === 404) {
    return new AnthropicError("AI_MODEL_UNAVAILABLE", 422);
  }
  if (response.status === 429) {
    return new AnthropicError(
      "AI_PROVIDER_RATE_LIMITED",
      429,
      response.headers.get("retry-after"),
    );
  }
  return new AnthropicError("AI_PROVIDER_ERROR", 502);
}

async function requestAnthropic(path, {
  apiKey,
  method = "GET",
  body,
  fetchImpl = fetch,
  timeoutMs = 30000,
} = {}) {
  const keyValidation = validateAnthropicApiKey(apiKey);
  if (!keyValidation.valid) {
    throw new AnthropicError(keyValidation.code, 400);
  }

  let response;
  try {
    response = await fetchImpl(`${ANTHROPIC_API_BASE_URL}${path}`, {
      method,
      headers: {
        "anthropic-version": ANTHROPIC_API_VERSION,
        "content-type": "application/json",
        "x-api-key": keyValidation.key,
      },
      body: body === undefined ? undefined : JSON.stringify(body),
      signal: typeof AbortSignal?.timeout === "function"
        ? AbortSignal.timeout(timeoutMs)
        : undefined,
      cache: "no-store",
    });
  } catch {
    throw new AnthropicError("AI_PROVIDER_UNREACHABLE", 502);
  }

  if (!response.ok) throw providerError(response);

  try {
    return await response.json();
  } catch {
    throw new AnthropicError("AI_PROVIDER_RESPONSE_INVALID", 502);
  }
}

export async function listAnthropicModels({ apiKey, fetchImpl } = {}) {
  const payload = await requestAnthropic("/models?limit=100", {
    apiKey,
    fetchImpl,
    timeoutMs: 15000,
  });
  const models = sanitizeAnthropicModels(payload);
  if (models.length === 0) {
    throw new AnthropicError("AI_MODEL_CATALOG_EMPTY", 502);
  }
  return models;
}

export async function createAnthropicSummary({
  apiKey,
  modelId,
  title,
  content,
  fetchImpl,
} = {}) {
  const modelValidation = validateAIModelId(modelId);
  if (!modelValidation.valid) {
    throw new AnthropicError(modelValidation.code, 400);
  }

  const payload = await requestAnthropic("/messages", {
    apiKey,
    fetchImpl,
    method: "POST",
    timeoutMs: 60000,
    body: {
      model: modelValidation.modelId,
      max_tokens: 150,
      system: "Tu es un assistant qui résume des notes. Génère un résumé concis en 2 phrases maximum, en français. Réponds uniquement avec le texte du résumé, sans formatage markdown, sans préfixe comme \"Résumé :\" et sans guillemets.",
      messages: [
        {
          role: "user",
          content: `Titre : ${title || "(sans titre)"}\n\nContenu : ${content || "(vide)"}`,
        },
      ],
    },
  });

  const text = normalizeSummaryText(
    payload?.content?.find((block) => block?.type === "text")?.text,
  );
  if (!text) throw new AnthropicError("AI_PROVIDER_RESPONSE_INVALID", 502);
  return text;
}
