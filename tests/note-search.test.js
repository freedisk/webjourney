import { describe, expect, it } from "vitest";
import { createNoteSearchIndex, noteSearchExcerpt, noteSearchText, searchNoteIndex } from "../lib/note-search";

const notes = Array.from({ length: 26 }, (_, index) => ({
  id: String(index), titre: index === 25 ? "Archives de l’ÉTÉ" : "Réunion " + index,
  contenu: "Une décision importante.", created_at: new Date(Date.UTC(2026, 9, 10 - index)).toISOString(),
}));

describe("recherche globale des notes en mémoire", () => {
  it("retrouve une note au-delà des huit récentes sans dépendre d'un filtre de vue", () => {
    const result = searchNoteIndex(createNoteSearchIndex(notes), "archives de l'ete");
    expect(result).toHaveLength(1);
    expect(result[0].id).toBe("25");
  });
  it("classe une correspondance de titre avant le corps puis par date", () => {
    const index = createNoteSearchIndex([
      { id: "body", titre: "Autre", contenu: "été", created_at: "2026-10-10" },
      { id: "older", titre: "Été", created_at: "2026-09-01" },
      { id: "recent", titre: "ÉTÉ", created_at: "2026-10-01" },
    ]);
    expect(searchNoteIndex(index, "ETE").map((note) => note.id)).toEqual(["recent", "older", "body"]);
  });
  it("recherche les tags et garde toutes les correspondances pour la pagination", () => {
    const index = createNoteSearchIndex(notes, { "25": ["t"] }, [{ id: "t", nom: "Formation" }]);
    expect(searchNoteIndex(index, "formation")[0].tag).toBe("Formation");
    expect(searchNoteIndex(index, "décision")).toHaveLength(26);
    expect(searchNoteIndex(index, "")[0].id).toBe("0");
  });
  it("exclut sources, légendes et URL privées des images", () => {
    const content = "Texte ![secret](capsule-image/12345678-1234-4123-8123-123456789012) "
      + "capsule-image/12345678-1234-4123-8123-123456789012 "
      + "https://test.supabase.co/storage/v1/object/sign/note-images/secret?token=private suite";
    expect(noteSearchText(content)).toBe("Texte suite");
    const result = searchNoteIndex(createNoteSearchIndex([{ id: "p", titre: "Note", contenu: content }]), "texte");
    expect(result[0].excerpt).not.toMatch(/secret|token|12345678|capsule-image|supabase/);
  });
  it("centre un extrait borné sur une correspondance tardive avec accents décomposés", () => {
    const text = "Préambule ".repeat(50) + "Éte\u0301 : décision principale. " + "Suite ".repeat(30);
    const excerpt = noteSearchExcerpt(text, "ete : decision");
    expect(excerpt).toContain("décision principale");
    expect(excerpt.length).toBeLessThanOrEqual(160);
  });
  it("conserve le texte HTML comme texte et ne produit pas de markup de surlignage", () => {
    const excerpt = noteSearchExcerpt("<script>alert(1)</script> Décision", "décision");
    expect(excerpt).toContain("<script>");
    expect(excerpt).not.toContain("<mark>");
  });
});
