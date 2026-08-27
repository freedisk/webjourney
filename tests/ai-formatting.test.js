import { describe, expect, it, vi } from "vitest";
import {
  AI_FORMAT_CHUNK_THRESHOLD,
  AI_FORMAT_OUTPUT_LIMIT,
  containsFormattableText,
  containsMalformedPrivateImageReference,
  estimateAIFormattingSections,
  maskPrivateImageReferences,
  maskProtectedFormattingFacts,
  restorePrivateImageReferences,
  restoreProtectedFormattingFacts,
  splitAIFormattingContent,
  validateAIFormattingFacts,
  validateAIFormattingTokens,
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

  it("masque puis restaure exactement les nombres, URL et tâches", () => {
    const source = "Le 15 août 2026, voir https://example.com/a?lot=42. [ ] Contrôler 3,5 m.";
    const masked = maskProtectedFormattingFacts(source, { nonce: NONCE });

    expect(masked.maskedContent).not.toContain("15");
    expect(masked.maskedContent).not.toContain("https://example.com");
    expect(masked.maskedContent).not.toContain("[ ]");
    expect(restoreProtectedFormattingFacts(masked.maskedContent, masked.placeholders))
      .toEqual({ valid: true, content: source });
    expect(restoreProtectedFormattingFacts(
      masked.maskedContent.replace(masked.placeholders[0].token, ""),
      masked.placeholders,
    )).toMatchObject({ valid: false });
  });

  it("découpe une note longue aux frontières utiles sans couper un marqueur privé", () => {
    const masked = maskPrivateImageReferences(
      `Début. ${"Une phrase descriptive. ".repeat(130)}![Privée](capsule-image/${IMAGE_A}) ${"Suite détaillée. ".repeat(90)}`,
      { nonce: NONCE },
    );
    const chunks = splitAIFormattingContent(masked.maskedContent, { maxLength: 1200 });

    expect(chunks.length).toBeGreaterThan(2);
    expect(chunks.every((chunk) => chunk.length <= 1200)).toBe(true);
    expect(chunks.filter((chunk) => chunk.includes(masked.placeholders[0].token))).toHaveLength(1);
    expect(chunks.join(" ").replace(/\s+/g, " ").trim()).toBe(
      masked.maskedContent.replace(/\s+/g, " ").trim(),
    );
    expect(estimateAIFormattingSections("Court")).toBe(1);
    expect(estimateAIFormattingSections("x".repeat(AI_FORMAT_CHUNK_THRESHOLD + 1)))
      .toBeGreaterThan(1);
  });

  it("conserve l'ordre des nombres, liens et tâches sans accepter une expansion excessive", () => {
    const source = "Rendez-vous le 15 août 2026. Voir https://example.com/a. [ ] Vérifier 42 éléments.";
    const proposal = "## Rendez-vous\n\n- Le 15 août 2026\n- Voir https://example.com/a\n- [ ] Vérifier 42 éléments";

    expect(validateAIFormattingFacts(source, proposal)).toEqual({ valid: true });
    expect(validateAIFormattingFacts(source, proposal.replace("42", "43"))).toMatchObject({
      valid: false,
    });
    expect(validateAIFormattingFacts(source, proposal.replace("https://example.com/a", "")))
      .toMatchObject({ valid: false });
    expect(validateAIFormattingFacts("Court", "x".repeat(1100))).toMatchObject({ valid: false });
  });

  it("valide l'ordre exact des jetons protégés dans une section", () => {
    const source = "Avant [[CAPSULE_FACT_aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa_0001]] après";
    expect(validateAIFormattingTokens(source, source)).toEqual({ valid: true });
    expect(validateAIFormattingTokens(source, source.replace("0001", "0002")))
      .toMatchObject({ valid: false });
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
    expect(upstreamBody.thinking).toEqual({ type: "disabled" });
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

  it("traite une note longue par sections bornées puis valide le résultat atomique", async () => {
    const source = `${"Constat détaillé numéro 42. ".repeat(480)}\n\n![Photo privée](capsule-image/${IMAGE_A})`;
    const upstreamBodies = [];
    const fetchImpl = vi.fn(async (_url, options) => {
      const body = JSON.parse(options.body);
      upstreamBodies.push(body);
      const section = body.messages[0].content.match(
        /<note-section>\n([\s\S]*)\n<\/note-section>/,
      )?.[1];
      return response({
        stop_reason: "end_turn",
        content: [{ type: "text", text: section }],
      });
    });

    const formatted = await createAnthropicFormatting({
      apiKey: VALID_KEY,
      modelId: "claude-sonnet-5",
      content: source,
      fetchImpl,
    });

    expect(fetchImpl.mock.calls.length).toBeGreaterThan(1);
    expect(upstreamBodies.reduce((sum, body) => sum + body.max_tokens, 0))
      .toBeLessThanOrEqual(12288);
    expect(upstreamBodies.every((body) => body.max_tokens < 8192)).toBe(true);
    expect(JSON.stringify(upstreamBodies)).not.toContain(IMAGE_A);
    expect(JSON.stringify(upstreamBodies)).not.toContain("Photo privée");
    expect(JSON.stringify(upstreamBodies)).not.toContain("numéro 42");
    expect(formatted).toContain(`![Photo privée](capsule-image/${IMAGE_A})`);
    expect(formatted.replace(/\s+/g, " ").trim()).toBe(source.replace(/\s+/g, " ").trim());
  });

  it("abandonne toute la proposition si une section longue est tronquée", async () => {
    const fetchImpl = vi.fn(async (_url, options) => {
      const body = JSON.parse(options.body);
      const section = body.messages[0].content.match(
        /<note-section>\n([\s\S]*)\n<\/note-section>/,
      )?.[1];
      const isSecondSection = body.messages[0].content.includes("section 2/");
      return response({
        stop_reason: isSecondSection ? "max_tokens" : "end_turn",
        content: [{ type: "text", text: section }],
      });
    });

    await expect(createAnthropicFormatting({
      apiKey: VALID_KEY,
      modelId: "claude-sonnet-5",
      content: "Une phrase complète. ".repeat(750),
      fetchImpl,
    })).rejects.toMatchObject({ code: "AI_FORMAT_RESPONSE_TRUNCATED", status: 502 });
  });

  it("distingue un timeout fournisseur d'une indisponibilité réseau", async () => {
    const timeout = new Error("timeout");
    timeout.name = "TimeoutError";

    await expect(createAnthropicFormatting({
      apiKey: VALID_KEY,
      modelId: "claude-sonnet-5",
      content: "Texte",
      fetchImpl: vi.fn(async () => { throw timeout; }),
    })).rejects.toMatchObject({ code: "AI_PROVIDER_TIMEOUT", status: 504 });
  });

  it("n'envoie la désactivation du thinking qu'aux modèles compatibles", async () => {
    let upstreamBody;
    const fetchImpl = vi.fn(async (_url, options) => {
      upstreamBody = JSON.parse(options.body);
      return response({
        stop_reason: "end_turn",
        content: [{ type: "text", text: "Texte" }],
      });
    });

    await createAnthropicFormatting({
      apiKey: VALID_KEY,
      modelId: "claude-haiku-4-5-20251001",
      content: "Texte",
      fetchImpl,
    });
    expect(upstreamBody).not.toHaveProperty("thinking");
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
