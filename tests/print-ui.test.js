import { readFile } from "node:fs/promises";
import path from "node:path";
import { describe, expect, it } from "vitest";

async function source(relativePath) {
  return readFile(path.join(process.cwd(), relativePath), "utf8");
}

describe("interface d'impression PRINT-001", () => {
  it("prépare les images avant le dialogue système et restaure l'état du document", async () => {
    const dialog = await source("components/PrintNoteDialog.js");

    expect(dialog).toContain("preparePrintableImages(documentRef.current");
    expect(dialog).toContain('document.body.classList.add("capsule-printing")');
    expect(dialog).toContain("window.print()");
    expect(dialog).toContain('document.body.classList.remove("capsule-printing")');
    expect(dialog).toContain("document.title = previousTitle");
    expect(dialog).toContain("Annuler la préparation");
    expect(dialog).toContain("preparationControllerRef.current?.abort");
    expect(dialog).toContain('role="alert"');
    expect(dialog).toContain("Un PDF enregistré devient une copie extérieure à Capsule");
  });

  it("rend le Markdown sans commandes interactives pour le papier", async () => {
    const [printable, markdown] = await Promise.all([
      source("components/PrintableNote.js"),
      source("components/MarkdownRenderer.js"),
    ]);

    expect(printable).toContain("interactive={false}");
    expect(printable).toContain("tags.map");
    expect(markdown).toContain('data-print-image="true"');
    expect(markdown).toContain("interactive && (");
    expect(markdown).toContain("ImageLightbox");
  });

  it("isole le document et applique une pagination papier claire", async () => {
    const css = await source("app/globals.css");

    expect(css).toContain("@page");
    expect(css).toContain("size: A4 portrait");
    expect(css).toContain("body.capsule-printing > .print-note-overlay");
    expect(css).toContain("break-inside: avoid-page");
    expect(css).toContain("color-scheme: light");
    expect(css).toContain("print-color-adjust: exact");
  });

  it("relie le détail, l'aide et le rafraîchissement des signatures privées", async () => {
    const [page, help, packageJson] = await Promise.all([
      source("app/page.js"),
      source("lib/help-content.js"),
      source("package.json"),
    ]);

    expect(page).toContain("<PrintNoteDialog");
    expect(page).toContain("onRefreshImages={chargerNoteImages}");
    expect(page).toContain("Imprimer / PDF");
    expect(help).toContain('id: "printing"');
    expect(packageJson).not.toMatch(/html2canvas|jspdf|react-pdf/i);
  });
});
