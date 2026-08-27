import { readFile } from "node:fs/promises";
import path from "node:path";
import { describe, expect, it } from "vitest";
import {
  filterHelpSections,
  HELP_QUICK_START_STEPS,
  HELP_SECTIONS,
  normalizeHelpText,
  sanitizeHelpProgress,
} from "../lib/help-content";

async function source(relativePath) {
  return readFile(path.join(process.cwd(), relativePath), "utf8");
}

describe("centre d’aide HELP-001", () => {
  it("couvre les usages structurants sans doublon de rubrique", () => {
    const ids = HELP_SECTIONS.map((section) => section.id);

    expect(new Set(ids).size).toBe(ids.length);
    expect(ids).toEqual(expect.arrayContaining([
      "quick-start",
      "notes",
      "images",
      "organization",
      "sharing",
      "pwa",
      "ai",
      "shortcuts",
      "troubleshooting",
    ]));
    expect(HELP_QUICK_START_STEPS).toHaveLength(5);
    expect(HELP_QUICK_START_STEPS.every((step) => ids.includes(step.sectionId))).toBe(true);
  });

  it("normalise les accents et filtre avec tous les termes", () => {
    expect(normalizeHelpText("Écran d’Accueil")).toBe("ecran d’accueil");
    expect(filterHelpSections("clé Anthropic").map((section) => section.id)).toEqual(["ai"]);
    expect(filterHelpSections("glisse photo").map((section) => section.id)).toEqual(["images"]);
    expect(filterHelpSections("écran accueil").map((section) => section.id)).toEqual(["pwa"]);
    expect(filterHelpSections("terme introuvable")).toEqual([]);
    expect(filterHelpSections("anthropic forme aperçu").map((section) => section.id)).toEqual(["ai"]);
  });

  it("nettoie la progression locale et ignore les identifiants inconnus", () => {
    expect(sanitizeHelpProgress({
      completed: ["create-note", "create-note", "intrus", "configure-ai"],
      checklistHidden: true,
    })).toEqual({
      completed: ["create-note", "configure-ai"],
      checklistHidden: true,
    });
    expect(sanitizeHelpProgress(null)).toEqual({ completed: [], checklistHidden: false });
  });

  it("reste statique, responsive et ne déclenche aucun appel réseau", async () => {
    const [component, content, styles] = await Promise.all([
      source("components/HelpCenterDialog.js"),
      source("lib/help-content.js"),
      source("app/globals.css"),
    ]);

    expect(component).not.toContain("fetch(");
    expect(content).not.toContain("fetch(");
    expect(component).toContain("HELP_PROGRESS_KEY");
    expect(component).toContain('aria-label="Rechercher dans le centre d’aide"');
    expect(component).toContain('aria-label="Rubriques d’aide"');
    expect(styles).toContain(".help-center-dialog");
    expect(styles).toContain("@media (max-width: 767px)");
    expect(styles).toContain("grid-template-rows: auto minmax(0, 1fr)");
    expect(styles).toContain("env(safe-area-inset-bottom, 0px)");
  });

  it("relie le menu, la palette, l’éditeur et les paramètres IA", async () => {
    const [page, header, editor, aiSettings] = await Promise.all([
      source("app/page.js"),
      source("components/AppHeader.js"),
      source("components/NoteContentEditor.js"),
      source("components/AISettingsDialog.js"),
    ]);

    expect(page).toContain("HelpCenterDialog");
    expect(page).toContain('label: "Ouvrir le centre d’aide"');
    expect(page).toContain('secondaryActionLabel="Découvrir Capsule"');
    expect(header).toContain("Centre d’aide");
    expect(editor).toContain('onOpenHelp("notes")');
    expect(editor).toContain('onOpenHelp("images")');
    expect(aiSettings).toContain("Comprendre les modes et la confidentialité");
  });
});
