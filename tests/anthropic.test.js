import { describe, expect, it, vi } from "vitest";
import {
  AnthropicError,
  createAnthropicSummary,
  listAnthropicModels,
} from "../lib/anthropic";

const VALID_KEY = `sk-ant-api03-${"b".repeat(48)}`;

function response(body, status = 200, headers = {}) {
  return {
    ok: status >= 200 && status < 300,
    status,
    headers: new Headers(headers),
    json: vi.fn(async () => body),
  };
}

describe("client Anthropic borné", () => {
  it("charge uniquement les métadonnées de modèles utiles", async () => {
    const fetchImpl = vi.fn(async () => response({
      data: [{ id: "claude-sonnet-5", display_name: "Claude Sonnet 5" }],
    }));

    await expect(listAnthropicModels({ apiKey: VALID_KEY, fetchImpl })).resolves.toEqual([
      expect.objectContaining({ id: "claude-sonnet-5", displayName: "Claude Sonnet 5" }),
    ]);
    expect(fetchImpl).toHaveBeenCalledWith(
      "https://api.anthropic.com/v1/models?limit=100",
      expect.objectContaining({
        method: "GET",
        cache: "no-store",
        headers: expect.objectContaining({ "x-api-key": VALID_KEY }),
      }),
    );
  });

  it("garde modèle, prompt et sortie sous contrôle serveur", async () => {
    let request;
    const fetchImpl = vi.fn(async (_url, options) => {
      request = JSON.parse(options.body);
      return response({ content: [{ type: "text", text: "Résumé : **Synthèse sûre.**" }] });
    });

    const summary = await createAnthropicSummary({
      apiKey: VALID_KEY,
      modelId: "claude-sonnet-5",
      title: "Titre",
      content: "Contenu",
      fetchImpl,
    });

    expect(summary).toBe("Synthèse sûre.");
    expect(request.model).toBe("claude-sonnet-5");
    expect(request.max_tokens).toBe(150);
    expect(request.system).toContain("2 phrases maximum");
    expect(request.messages[0].content).toContain("Titre : Titre");
  });

  it("normalise les rejets sans lire ni propager le corps fournisseur", async () => {
    const upstream = response({ error: { message: `secret ${VALID_KEY}` } }, 401);
    const fetchImpl = vi.fn(async () => upstream);

    await expect(listAnthropicModels({ apiKey: VALID_KEY, fetchImpl })).rejects.toMatchObject({
      name: "AnthropicError",
      code: "AI_KEY_REJECTED",
      status: 422,
    });
    expect(upstream.json).not.toHaveBeenCalled();
  });

  it("transmet seulement le délai public lors d'un quota Anthropic", async () => {
    const fetchImpl = vi.fn(async () => response({}, 429, { "retry-after": "7" }));
    let caught;
    try {
      await listAnthropicModels({ apiKey: VALID_KEY, fetchImpl });
    } catch (error) {
      caught = error;
    }
    expect(caught).toBeInstanceOf(AnthropicError);
    expect(caught).toMatchObject({ code: "AI_PROVIDER_RATE_LIMITED", status: 429, retryAfter: "7" });
  });
});
