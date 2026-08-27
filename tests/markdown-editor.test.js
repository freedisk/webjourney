import { describe, expect, it } from "vitest";
import { applyMarkdownFormat } from "../lib/markdown-editor";

describe("éditeur Markdown", () => {
  it("entoure la sélection avec un format inline", () => {
    expect(applyMarkdownFormat("bonjour monde", 8, 13, "bold")).toEqual({
      value: "bonjour **monde**",
      selectionStart: 10,
      selectionEnd: 15,
    });
  });

  it("insère un texte indicatif lorsqu'il n'y a pas de sélection", () => {
    const result = applyMarkdownFormat("", 0, 0, "italic");
    expect(result.value).toBe("_texte en italique_");
    expect(result.value.slice(result.selectionStart, result.selectionEnd)).toBe("texte en italique");
  });

  it("préfixe toutes les lignes sélectionnées", () => {
    expect(applyMarkdownFormat("alpha\nbeta", 0, 10, "bullet").value).toBe("- alpha\n- beta");
    expect(applyMarkdownFormat("alpha\nbeta", 0, 10, "numbered").value).toBe("1. alpha\n2. beta");
  });

  it("sélectionne l'URL du lien pour permettre son remplacement immédiat", () => {
    const result = applyMarkdownFormat("Capsule", 0, 7, "link");
    expect(result.value).toBe("[Capsule](https://)");
    expect(result.value.slice(result.selectionStart, result.selectionEnd)).toBe("https://");
  });
});
