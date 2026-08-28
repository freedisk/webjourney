"use client";

import { CURRENT_BUILD_INFO, shortBuildId } from "@/lib/app-version";

export default function AppFooter({ onOpenAbout }) {
  const shortBuild = shortBuildId(CURRENT_BUILD_INFO.buildId);

  return (
    <footer className="app-version-footer" aria-label="Version de l’application">
      <button
        type="button"
        onClick={onOpenAbout}
        aria-label={`À propos de Capsule, version ${CURRENT_BUILD_INFO.version}, build ${shortBuild}`}
      >
        <span className="app-version-footer-brand">Capsule</span>
        <span aria-hidden="true">·</span>
        <span>v{CURRENT_BUILD_INFO.version}</span>
        <span className="app-version-footer-build" aria-hidden="true">· build {shortBuild}</span>
        <span aria-hidden="true">·</span>
        <span className="app-version-footer-link">À propos</span>
      </button>
    </footer>
  );
}
