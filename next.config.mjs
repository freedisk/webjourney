import { execFileSync } from "node:child_process";
import { readFileSync } from "node:fs";

const packageMetadata = JSON.parse(
  readFileSync(new URL("./package.json", import.meta.url), "utf8"),
);

function resolveBuildSha() {
  const vercelSha = process.env.VERCEL_GIT_COMMIT_SHA?.trim();
  if (/^[a-f0-9]{7,64}$/i.test(vercelSha || "")) return vercelSha;

  try {
    const gitSha = execFileSync("git", ["rev-parse", "HEAD"], {
      cwd: process.cwd(),
      encoding: "utf8",
      stdio: ["ignore", "pipe", "ignore"],
    }).trim();
    return /^[a-f0-9]{7,64}$/i.test(gitSha) ? gitSha : "local";
  } catch {
    // Une archive sans métadonnées Git reste identifiable comme build local.
    return "local";
  }
}

function resolveBuildDate() {
  const configuredDate = process.env.CAPSULE_BUILD_DATE?.trim();
  if (configuredDate && !Number.isNaN(Date.parse(configuredDate))) {
    return new Date(configuredDate).toISOString();
  }
  return new Date().toISOString();
}

const publicBuildInfo = Object.freeze({
  version: packageMetadata.version,
  buildId: resolveBuildSha(),
  builtAt: resolveBuildDate(),
});

/** @type {import('next').NextConfig} */
const nextConfig = {
  reactCompiler: true,
  // Ces trois valeurs non sensibles sont figées dans chaque livraison.
  env: {
    NEXT_PUBLIC_CAPSULE_VERSION: publicBuildInfo.version,
    NEXT_PUBLIC_CAPSULE_BUILD_ID: publicBuildInfo.buildId,
    NEXT_PUBLIC_CAPSULE_BUILT_AT: publicBuildInfo.builtAt,
  },
  // Éviter qu'un package-lock.json situé plus haut sur le poste soit pris pour racine.
  turbopack: {
    root: process.cwd(),
  },
  async headers() {
    return [
      {
        source: "/sw.js",
        headers: [
          { key: "Content-Type", value: "application/javascript; charset=utf-8" },
          { key: "Cache-Control", value: "no-cache, no-store, must-revalidate" },
          { key: "Content-Security-Policy", value: "default-src 'self'; script-src 'self'" },
          { key: "Service-Worker-Allowed", value: "/" },
        ],
      },
      {
        source: "/manifest.webmanifest",
        headers: [
          { key: "Cache-Control", value: "public, max-age=0, must-revalidate" },
        ],
      },
    ];
  },
};

export default nextConfig;
