import { readFile } from "node:fs/promises";
import path from "node:path";
import { describe, expect, it } from "vitest";

async function source(relativePath) {
  return readFile(path.join(process.cwd(), relativePath), "utf8");
}

describe("fondations UX-002", () => {
  it("conserve un dialogue modal accessible avec focus restauré", async () => {
    const dialog = await source("components/ui/Dialog.js");

    expect(dialog).toContain('role="dialog"');
    expect(dialog).toContain('aria-modal="true"');
    expect(dialog).toContain('event.key === "Escape"');
    expect(dialog).toContain("previousFocusRef.current?.focus");
  });

  it("expose navigation, palette et action principale avec des noms accessibles", async () => {
    const [header, page] = await Promise.all([
      source("components/AppHeader.js"),
      source("app/page.js"),
    ]);

    expect(header).toContain('aria-label="Nouvelle note"');
    expect(header).toContain("ViewSwitcher");
    expect(page).toContain("CommandPalette");
    expect(page).toContain("MobileNavigation");
    expect(page).toContain('(e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k"');
    expect(page).toContain("notesRef.current.find");
    expect(page).toContain('(noteActuelle.kanban_colonne || "todo") !== nouvelleColonne');
  });

  it("fournit une écriture Markdown assistée et son aperçu", async () => {
    const editor = await source("components/NoteContentEditor.js");

    expect(editor).toContain("applyMarkdownFormat");
    expect(editor).toContain('["preview", "Aperçu"]');
    expect(editor).toContain("aria-pressed={editorMode === mode}");
    expect(editor).toContain("MarkdownRenderer");
  });

  it("préserve les cibles tactiles et le mouvement réduit", async () => {
    const css = await source("app/globals.css");

    expect(css).toContain("--control-height: 2.75rem");
    expect(css).toContain("env(safe-area-inset-bottom, 0px)");
    expect(css).toContain("prefers-reduced-motion: reduce");
  });
});
