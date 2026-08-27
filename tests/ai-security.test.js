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
    const [summaryRoute, settingsRoute, modelsRoute] = await Promise.all([
      source("app/api/resumer/route.js"),
      source("app/api/ai/settings/route.js"),
      source("app/api/ai/models/route.js"),
    ]);
    const routes = summaryRoute + settingsRoute + modelsRoute;
    expect(routes).not.toContain("process.env.ANTHROPIC_API_KEY");
    expect(routes).toContain("requireSupabaseUser(request)");
    expect(routes).toContain("consumeAIQuota");
    expect(summaryRoute).toContain("AI_CONFIGURATION_REQUIRED");
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
