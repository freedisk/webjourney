import { describe, expect, it } from "vitest";
import { isNoteDraftChanged, noteDraftSnapshot, noteDraftStatus } from "../lib/note-draft";

describe("état d'une saisie manuelle", () => {
  it("compare le snapshot initial sans dépendre d'une note rafraîchie", () => {
    const draft = { title: "Titre", content: "Texte", color: null };
    const baseline = noteDraftSnapshot(draft);
    expect(isNoteDraftChanged(draft, baseline)).toBe(false);
    for (const change of [{ title: "Autre" }, { content: "Autre" }, { color: "#fff" }, { pendingImages: [{ id: "image" }] }]) {
      expect(isNoteDraftChanged({ ...draft, ...change }, baseline)).toBe(true);
    }
    expect(isNoteDraftChanged(draft, baseline)).toBe(false);
  });
  it("ne considère pas le simple réordonnancement des images comme une nouvelle saisie", () => {
    const baseline = noteDraftSnapshot({ pendingImages: [{ id: "a" }, { id: "b" }] });
    expect(isNoteDraftChanged({ pendingImages: [{ id: "b" }, { id: "a" }] }, baseline)).toBe(false);
  });
  it("signale préparation, envoi et erreur avant tout état enregistré", () => {
    expect(noteDraftStatus({ changed: true, preparing: true, failed: true })).toBe("Préparation des images…");
    expect(noteDraftStatus({ changed: true, saving: true })).toBe("Enregistrement…");
    expect(noteDraftStatus({ changed: true, failed: true })).toContain("Réessayer");
    expect(noteDraftStatus({ changed: true })).toBe("Modifications non enregistrées");
    expect(noteDraftStatus({ changed: false })).toBe("Enregistré");
    expect(noteDraftStatus({ changed: false, creating: true })).toBe("Nouvelle note");
  });
});
