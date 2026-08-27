import { describe, expect, it, vi } from "vitest";
import {
  AI_FORMAT_OUTPUT_LIMIT,
  containsFormattableText,
  containsMalformedPrivateImageReference,
  maskPrivateImageReferences,
  restorePrivateImageReferences,
} from "../lib/ai-formatting";
import { createAnthropicFormatting } from "../lib/anthropic";

const VALID_KEY = `sk-ant-api03-${"c".repeat(48)}`;
const IMAGE_A = "123e4567-e89b-12d3-a456-426614174000";
const IMAGE_B = "987e6543-e21b-12d3-a456-426614174999";
const NONCE = "a".repeat(32);

function response(body, status = 200) {
  return {
    ok: status >= 200 && status < 300,
    status,
    headers: new Headers(),
    json: vi.fn(async () => body),
  };
}

describe("mise en forme IA bornée", () => {
  it("distingue le texte utile d'une note contenant seulement des images", () => {
    expect(containsFormattableText(`![Secret](capsule-image/${IMAGE_A})`)).toBe(false);
    expect(containsFormattableText(`capsule-image/${IMAGE_A}`)).toBe(false);
    expect(containsFormattableText(`À retenir\n\n![Secret](capsule-image/${IMAGE_A})`)).toBe(true);
    expect(containsMalformedPrivateImageReference(`![Secret](capsule-image/${IMAGE_A})`)).toBe(false);
    expect(containsMalformedPrivateImageReference("capsule-image/identifiant-invalide")).toBe(true);
  });

  it("masque intégralement les références privées puis les restaure à l'identique", () => {
    const source = [
      "Avant",
      `![Légende privée](capsule-image/${IMAGE_A})`,
      `Chemin brut capsule-image/${IMAGE_B}`,
      "Après",
    ].join("\n\n");
    const masked = maskPrivateImageReferences(source, { nonce: NONCE });

    expect(masked.maskedContent).not.toContain("capsule-image/");
    expect(masked.maskedContent).not.toContain("Légende privée");
    expect(masked.placeholders).toHaveLength(2);
    expect(restorePrivateImageReferences(masked.maskedContent, masked.placeholders)).toEqual({
      valid: true,
      content: source,
    });
  });

  it("rejette tout marqueur d'image perdu, dupliqué, réordonné ou inventé", () => {
    const source = `Texte\n![A](capsule-image/${IMAGE_A})\n![B](capsule-image/${IMAGE_B})`;
    const masked = maskPrivateImageReferences(source, { nonce: NONCE });
    const [first, second] = masked.placeholders.map((item) => item.token);

    for (const proposal of [
      `Texte\n${first}`,
      `Texte\n${first}\n${first}\n${second}`,
      `Texte\n${second}\n${first}`,
      `Texte\n${first}\n${second}\n[[CAPSULE_IMAGE_${"b".repeat(32)}_0001]]`,
      `Texte\n${first}\n${second}\ncapsule-image/${IMAGE_A}`,
    ]) {
      expect(restorePrivateImageReferences(proposal, masked.placeholders)).toMatchObject({
        valid: false,
        code: "AI_FORMAT_RESPONSE_INVALID",
      });
    }
  });

  it("préserve un bloc Markdown englobant et borne la sortie", () => {
    expect(restorePrivateImageReferences("```markdown\n## Titre\n```", [])).toEqual({
      valid: true,
      content: "```markdown\n## Titre\n```",
    });
    expect(restorePrivateImageReferences("x".repeat(AI_FORMAT_OUTPUT_LIMIT + 1), [])).toMatchObject({
      valid: false,
    });
  });

  it("ne transmet aucune référence privée et restaure la proposition validée", async () => {
    const source = `texte brut\n\n![Très privée](capsule-image/${IMAGE_A})`;
    let upstreamBody;
    const fetchImpl = vi.fn(async (_url, options) => {
      upstreamBody = JSON.parse(options.body);
      const token = upstreamBody.messages[0].content.match(/\[\[CAPSULE_IMAGE_[^\]]+\]\]/)[0];
      return response({
        stop_reason: "end_turn",
        content: [{ type: "text", text: `## Texte\n\n${token}` }],
      });
    });

    const formatted = await createAnthropicFormatting({
      apiKey: VALID_KEY,
      modelId: "claude-sonnet-5",
      content: source,
      fetchImpl,
    });

    expect(JSON.stringify(upstreamBody)).not.toContain(IMAGE_A);
    expect(JSON.stringify(upstreamBody)).not.toContain("Très privée");
    expect(upstreamBody.max_tokens).toBe(8192);
    expect(upstreamBody).not.toHaveProperty("temperature");
    expect(upstreamBody.system).toContain("Ne résume pas");
    expect(formatted).toBe(`## Texte\n\n![Très privée](capsule-image/${IMAGE_A})`);
  });

  it("rejette une réponse tronquée ou qui altère un marqueur privé", async () => {
    const truncatedFetch = vi.fn(async () => response({
      stop_reason: "max_tokens",
      content: [{ type: "text", text: "partiel" }],
    }));
    await expect(createAnthropicFormatting({
      apiKey: VALID_KEY,
      modelId: "claude-sonnet-5",
      content: "Texte",
      fetchImpl: truncatedFetch,
    })).rejects.toMatchObject({ code: "AI_FORMAT_RESPONSE_TRUNCATED", status: 502 });

    const changedTokenFetch = vi.fn(async () => response({
      stop_reason: "end_turn",
      content: [{ type: "text", text: "Texte sans le marqueur" }],
    }));
    await expect(createAnthropicFormatting({
      apiKey: VALID_KEY,
      modelId: "claude-sonnet-5",
      content: `Texte ![A](capsule-image/${IMAGE_A})`,
      fetchImpl: changedTokenFetch,
    })).rejects.toMatchObject({ code: "AI_FORMAT_RESPONSE_INVALID", status: 502 });
  });

  it("refuse une référence privée mal formée avant tout appel fournisseur", async () => {
    const fetchImpl = vi.fn();
    await expect(createAnthropicFormatting({
      apiKey: VALID_KEY,
      modelId: "claude-sonnet-5",
      content: "Texte capsule-image/identifiant-invalide",
      fetchImpl,
    })).rejects.toMatchObject({ code: "AI_FORMAT_IMAGE_REFERENCE_INVALID", status: 400 });
    expect(fetchImpl).not.toHaveBeenCalled();
  });
});
