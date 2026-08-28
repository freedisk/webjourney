import { readFile } from "node:fs/promises";
import path from "node:path";
import { describe, expect, it, vi } from "vitest";
import {
  fetchLatestBuildInfo,
  formatBuildDate,
  isDifferentBuild,
  parseBuildInfo,
  shortBuildId,
} from "../lib/app-version";
import { RELEASE_NOTES } from "../lib/release-notes";

async function source(relativePath) {
  return readFile(path.join(process.cwd(), relativePath), "utf8");
}

const CURRENT = Object.freeze({
  version: "1.0.0",
  buildId: "0123456789abcdef0123456789abcdef01234567",
  builtAt: "2026-08-28T14:00:00.000Z",
});

describe("version et mises à jour REL-001", () => {
  it("publie une version SemVer cohérente dans les manifestes et le changelog", async () => {
    const [packageJson, packageLock] = await Promise.all([
      source("package.json").then(JSON.parse),
      source("package-lock.json").then(JSON.parse),
    ]);

    expect(packageJson.version).toBe("1.0.0");
    expect(packageLock.version).toBe(packageJson.version);
    expect(packageLock.packages[""].version).toBe(packageJson.version);
    expect(RELEASE_NOTES[0].version).toBe(packageJson.version);
    expect(RELEASE_NOTES.length).toBeLessThanOrEqual(5);
  });

  it("valide et formate une identité de build sans exposer le SHA complet", () => {
    expect(parseBuildInfo(CURRENT)).toEqual(CURRENT);
    expect(parseBuildInfo({ ...CURRENT, version: "latest" })).toBeNull();
    expect(parseBuildInfo({ ...CURRENT, buildId: "../../secret" })).toBeNull();
    expect(parseBuildInfo({ ...CURRENT, builtAt: "demain" })).toBeNull();
    expect(shortBuildId(CURRENT.buildId)).toBe("0123456");
    expect(shortBuildId("local")).toBe("local");
    expect(formatBuildDate("invalide")).toBe("date inconnue");
  });

  it("détecte uniquement une livraison différente de celle chargée", () => {
    expect(isDifferentBuild(CURRENT, { ...CURRENT })).toBe(false);
    expect(isDifferentBuild(CURRENT, { ...CURRENT, version: "1.1.0" })).toBe(true);
    expect(isDifferentBuild(CURRENT, { ...CURRENT, buildId: "abcdef0123456789" })).toBe(true);
    expect(isDifferentBuild(CURRENT, { ...CURRENT, buildId: "invalide" })).toBe(false);
  });

  it("interroge explicitement l’endpoint sans cache et valide sa réponse", async () => {
    const fetchImpl = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => CURRENT,
    });

    await expect(fetchLatestBuildInfo({ fetchImpl })).resolves.toEqual(CURRENT);
    expect(fetchImpl).toHaveBeenCalledWith("/api/version", expect.objectContaining({
      method: "GET",
      cache: "no-store",
      headers: { Accept: "application/json" },
    }));
  });

  it("refuse une réponse réseau invalide ou indisponible", async () => {
    await expect(fetchLatestBuildInfo({
      fetchImpl: async () => ({ ok: false }),
    })).rejects.toThrow("VERSION_CHECK_UNAVAILABLE");

    await expect(fetchLatestBuildInfo({
      fetchImpl: async () => ({ ok: true, json: async () => ({ secret: "non" }) }),
    })).rejects.toThrow("VERSION_CHECK_INVALID_RESPONSE");
  });

  it("limite l’API de version à des métadonnées publiques non mises en cache", async () => {
    const [route, config] = await Promise.all([
      source("app/api/version/route.js"),
      source("next.config.mjs"),
    ]);

    expect(route).toContain('dynamic = "force-dynamic"');
    expect(route).toContain('"Cache-Control": "no-store, max-age=0, must-revalidate"');
    expect(route).not.toMatch(/supabase|anthropic|note|storage_path/i);
    expect(config).toContain("VERCEL_GIT_COMMIT_SHA");
    expect(config).toContain("NEXT_PUBLIC_CAPSULE_VERSION");
    expect(config).not.toMatch(/NEXT_PUBLIC_(?:ANTHROPIC|SUPABASE_SERVICE|AI_SECRET)/);
  });

  it("relie le menu, la palette, le footer et le dialogue accessible", async () => {
    const [page, header, footer, dialog, helpContent, styles] = await Promise.all([
      source("app/page.js"),
      source("components/AppHeader.js"),
      source("components/AppFooter.js"),
      source("components/AboutDialog.js"),
      source("lib/help-content.js"),
      source("app/globals.css"),
    ]);

    expect(page).toContain("<AboutDialog");
    expect(page).toContain("<AppFooter");
    expect(page).toContain('label: "À propos de Capsule"');
    expect(header).toContain("À propos");
    expect(footer).not.toContain("fetch(");
    expect(dialog).toContain("aria-live=\"polite\"");
    expect(dialog).toContain("checkForUpdates");
    expect(dialog).toContain("Aucune note, image, clé IA ou donnée de compte");
    expect(helpContent).toContain("La PWA semble utiliser une ancienne version");
    expect(styles).toContain(".app-version-footer");
    expect(styles).toContain(".about-dialog");
    expect(styles).toContain(".app-version-footer-brand + span");
  });
});
