import { readFile } from "node:fs/promises";
import path from "node:path";
import { describe, expect, it } from "vitest";

async function source(relativePath) {
  return readFile(path.join(process.cwd(), relativePath), "utf8");
}

describe("frontières de sécurité AI-001", () => {
  it("ne persiste jamais une clé IA dans le stockage du navigateur", async () => {
    const dialog = await source("components/AISettingsDialog.js");
    expect(dialog).not.toContain("localStorage");
    expect(dialog).not.toContain("sessionStorage");
    expect(dialog).not.toContain("indexedDB");
    expect(dialog).toContain("onUseSessionCredential");
    expect(dialog).toContain('type="password"');
  });

  it("n'utilise plus implicitement la clé Anthropic globale", async () => {
    const [summaryRoute, formattingRoute, settingsRoute, modelsRoute] = await Promise.all([
      source("app/api/resumer/route.js"),
      source("app/api/ai/format/route.js"),
      source("app/api/ai/settings/route.js"),
      source("app/api/ai/models/route.js"),
    ]);
    const routes = summaryRoute + formattingRoute + settingsRoute + modelsRoute;
    expect(routes).not.toContain("process.env.ANTHROPIC_API_KEY");
    expect(routes).toContain("requireSupabaseUser(request)");
    expect(routes).toContain("consumeAIQuota");
    expect(summaryRoute).toContain("AI_CONFIGURATION_REQUIRED");
    expect(formattingRoute).toContain("createAnthropicFormatting");
    expect(formattingRoute).toContain("containsFormattableText");
  });

  it("n'applique jamais une proposition de mise en forme sans validation explicite", async () => {
    const [page, dialog, editor, formatting, styles] = await Promise.all([
      source("app/page.js"),
      source("components/AIFormattingDialog.js"),
      source("components/NoteContentEditor.js"),
      source("lib/ai-formatting.js"),
      source("app/globals.css"),
    ]);

    expect(page).toContain("appliquerMiseEnForme");
    expect(page).toContain("Sauvegarde la note pour la conserver");
    expect(page).toContain("contenu !== aiFormatting.source");
    expect(dialog).toContain("Appliquer à l&apos;éditeur");
    expect(dialog).toContain("rien n'est modifié ni enregistré sans ton accord");
    expect(editor).toContain("onSmartFormat");
    expect(editor).toContain('aria-label="Mettre en forme avec l’IA"');
    expect(formatting).toContain("maskPrivateImageReferences");
    expect(formatting).toContain("splitAIFormattingContent");
    expect(formatting).not.toContain("localStorage");
    expect(styles).toContain(".ai-formatting-comparison");
    expect(styles).toContain(".ai-formatting-elapsed");
    expect(styles).toContain("grid-template-columns: minmax(0, 1fr)");
    expect(page).toContain("AI_FORMAT_CLIENT_TIMEOUT_MS");
    expect(dialog).toContain("Traitement de la note longue");
    expect(page).toContain("!isWithinModalFocus(modalPanelRef.current, document.activeElement)");
  });

  it("interdit le Vault au navigateur et purge les secrets", async () => {
    const migration = await source("supabase/migrations/20260827094500_add_user_ai_settings.sql");
    expect(migration).toContain("create extension if not exists supabase_vault");
    expect(migration).toContain("revoke all on schema vault from public, anon, authenticated, service_role");
    expect(migration).toContain("revoke all on all tables in schema vault from public, anon, authenticated, service_role");
    expect(migration).not.toContain("revoke all on all functions in schema vault");
    expect(migration).toContain("user_ai_settings_cleanup_vault_secret");
    expect(migration).toContain("before delete on public.user_ai_settings");
    expect(migration).toContain("grant execute on function public.get_user_ai_credential(uuid)");
  });

  it("expose l'accès aux paramètres dans le menu et la palette", async () => {
    const [header, page] = await Promise.all([
      source("components/AppHeader.js"),
      source("app/page.js"),
    ]);
    expect(header).toContain("Paramètres IA");
    expect(page).toContain('id: "open-ai-settings"');
    expect(page).toContain("AISettingsDialog");
  });
});
