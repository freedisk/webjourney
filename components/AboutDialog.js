"use client";

import Image from "next/image";
import { useEffect, useRef, useState } from "react";
import Dialog from "@/components/ui/Dialog";
import Icon from "@/components/ui/Icon";
import {
  CURRENT_BUILD_INFO,
  fetchLatestBuildInfo,
  formatBuildDate,
  isDifferentBuild,
  shortBuildId,
} from "@/lib/app-version";
import { RELEASE_NOTES } from "@/lib/release-notes";

const IDLE_CHECK = Object.freeze({ status: "idle", latest: null, message: "" });

function formatReleaseDate(value) {
  return new Intl.DateTimeFormat("fr-FR", {
    day: "numeric",
    month: "long",
    year: "numeric",
    timeZone: "UTC",
  }).format(new Date(`${value}T00:00:00.000Z`));
}

export default function AboutDialog({ open, onClose }) {
  const [check, setCheck] = useState(IDLE_CHECK);
  const controllerRef = useRef(null);

  useEffect(() => () => controllerRef.current?.abort(), []);

  function closeDialog() {
    controllerRef.current?.abort();
    setCheck(IDLE_CHECK);
    onClose();
  }

  async function checkForUpdates() {
    controllerRef.current?.abort();
    const controller = new AbortController();
    controllerRef.current = controller;
    setCheck({ status: "checking", latest: null, message: "" });

    try {
      const latest = await fetchLatestBuildInfo({ signal: controller.signal });
      setCheck({
        status: isDifferentBuild(CURRENT_BUILD_INFO, latest) ? "update" : "current",
        latest,
        message: "",
      });
    } catch (error) {
      if (error?.name === "AbortError") return;
      const offline = typeof navigator !== "undefined" && navigator.onLine === false;
      setCheck({
        status: "error",
        latest: null,
        message: offline
          ? "Aucune connexion. La version chargée reste utilisable."
          : "Impossible de vérifier pour le moment. Réessaie dans quelques instants.",
      });
    }
  }

  async function reloadApplication() {
    try {
      const registration = await navigator.serviceWorker?.getRegistration();
      await registration?.update();
    } catch {
      // Le rechargement reste valable si Safari ne permet pas de forcer le contrôle PWA.
    } finally {
      window.location.reload();
    }
  }

  const footer = (
    <div className="about-footer-actions">
      <button type="button" className="btn-brutal ghost" onClick={closeDialog}>Fermer</button>
      {check.status === "update" ? (
        <button type="button" className="btn-brutal primary" onClick={reloadApplication}>
          <Icon name="refresh" size={16} /> Recharger maintenant
        </button>
      ) : (
        <button
          type="button"
          className="btn-brutal primary"
          onClick={checkForUpdates}
          disabled={check.status === "checking"}
          aria-busy={check.status === "checking"}
        >
          <Icon name="refresh" size={16} />
          {check.status === "checking" ? "Vérification…" : "Vérifier les mises à jour"}
        </button>
      )}
    </div>
  );

  return (
    <Dialog
      open={open}
      onClose={closeDialog}
      title="À propos de Capsule"
      description="L’identité de la version chargée, les dernières évolutions et un contrôle explicite des mises à jour."
      className="about-dialog"
      footer={footer}
    >
      <div className="about-hero">
        <Image src="/icons/icon-192.png" width={72} height={72} alt="" aria-hidden="true" />
        <div>
          <p className="about-kicker">Notes personnelles · PWA</p>
          <h3>Capsule</h3>
          <p>Une application privée pour saisir, illustrer, organiser et partager ses notes.</p>
        </div>
      </div>

      <section className="about-build-card" aria-labelledby="about-build-title">
        <div className="about-section-heading">
          <div>
            <p className="about-kicker">Installée sur cet appareil</p>
            <h3 id="about-build-title">Version chargée</h3>
          </div>
          <span className="about-version-badge">v{CURRENT_BUILD_INFO.version}</span>
        </div>
        <dl className="about-build-grid">
          <div><dt>Version</dt><dd>{CURRENT_BUILD_INFO.version}</dd></div>
          <div><dt>Build</dt><dd>{shortBuildId(CURRENT_BUILD_INFO.buildId)}</dd></div>
          <div><dt>Construit le</dt><dd>{formatBuildDate(CURRENT_BUILD_INFO.builtAt)}</dd></div>
        </dl>

        <div
          className={`about-update-status is-${check.status}`}
          role="status"
          aria-live="polite"
          aria-atomic="true"
        >
          {check.status === "idle" && <><Icon name="info" size={18} /><span>La vérification est lancée uniquement à ta demande.</span></>}
          {check.status === "checking" && <><span className="about-status-spinner" aria-hidden="true" /><span>Comparaison avec la version actuellement en production…</span></>}
          {check.status === "current" && <><Icon name="check" size={18} /><span>Capsule est à jour.</span></>}
          {check.status === "update" && <><Icon name="refresh" size={18} /><span>Une nouvelle livraison est disponible : v{check.latest.version}, build {shortBuildId(check.latest.buildId)}.</span></>}
          {check.status === "error" && <><Icon name="info" size={18} /><span>{check.message}</span></>}
        </div>
      </section>

      <section className="about-changelog" aria-labelledby="about-changelog-title">
        <div className="about-section-heading">
          <div>
            <p className="about-kicker">Changelog concis</p>
            <h3 id="about-changelog-title">Dernières étapes</h3>
          </div>
        </div>
        <ol>
          {RELEASE_NOTES.map((release) => (
            <li key={`${release.version || "milestone"}-${release.date}`}>
              <div className="about-release-line">
                <strong>{release.version ? `v${release.version} · ${release.title}` : release.title}</strong>
                <time dateTime={release.date}>{formatReleaseDate(release.date)}</time>
              </div>
              <ul>
                {release.highlights.map((highlight) => <li key={highlight}>{highlight}</li>)}
              </ul>
            </li>
          ))}
        </ol>
      </section>

      <p className="about-privacy-note">
        <Icon name="info" size={16} />
        La vérification transmet seulement une requête technique à Capsule. Aucune note, image, clé IA ou donnée de compte n’est envoyée.
      </p>
    </Dialog>
  );
}
