import { describe, expect, it } from "vitest";
import {
  chooseDefaultAIModel,
  normalizeSummaryText,
  sanitizeAnthropicModels,
  validateAIModelId,
  validateAnthropicApiKey,
} from "../lib/ai-config";

const VALID_KEY = `sk-ant-api03-${"a".repeat(48)}`;

describe("configuration IA", () => {
  it("accepte une clé Anthropic plausible sans jamais la transformer", () => {
    expect(validateAnthropicApiKey(VALID_KEY)).toEqual({ valid: true, key: VALID_KEY });
  });

  it("refuse les clés absentes, courtes, non Anthropic ou contenant des espaces", () => {
    expect(validateAnthropicApiKey("").code).toBe("AI_KEY_REQUIRED");
    expect(validateAnthropicApiKey("sk-ant-court").valid).toBe(false);
    expect(validateAnthropicApiKey(`api-${"a".repeat(40)}`).valid).toBe(false);
    expect(validateAnthropicApiKey(`${VALID_KEY} fuite`).valid).toBe(false);
  });

  it("borne les identifiants de modèles Claude", () => {
    expect(validateAIModelId("claude-sonnet-4-5-20250929")).toEqual({
      valid: true,
      modelId: "claude-sonnet-4-5-20250929",
    });
    expect(validateAIModelId("gpt-5").valid).toBe(false);
    expect(validateAIModelId("claude-sonnet/../../secret").valid).toBe(false);
  });

  it("assainit, déduplique et sélectionne Sonnet par défaut", () => {
    const models = sanitizeAnthropicModels({
      data: [
        { id: "claude-opus-5", display_name: "Claude Opus 5" },
        { id: "claude-sonnet-5", display_name: "Claude Sonnet 5" },
        { id: "claude-sonnet-5", display_name: "Doublon" },
        { id: "modele/invalide", display_name: "Invalide" },
      ],
    });

    expect(models).toHaveLength(2);
    expect(chooseDefaultAIModel(models)).toBe("claude-sonnet-5");
    expect(chooseDefaultAIModel(models, "claude-opus-5")).toBe("claude-opus-5");
  });

  it("nettoie uniquement le format résiduel du résumé", () => {
    expect(normalizeSummaryText("**Résumé :** contenu utile")).toBe("contenu utile");
    expect(normalizeSummaryText("Résumé : contenu utile")).toBe("contenu utile");
  });
});
