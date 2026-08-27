"use client";

import { useState } from "react";
import Dialog from "@/components/ui/Dialog";
import Icon from "@/components/ui/Icon";
import MarkdownRenderer from "@/components/MarkdownRenderer";

export default function AIFormattingDialog({
  open,
  source,
  proposal,
  loading,
  error,
  imageUrls = {},
  onClose,
  onRetry,
  onApply,
  onConfigure,
  onOpenHelp,
}) {
  const [comparisonMode, setComparisonMode] = useState("preview");

  const unchanged = Boolean(proposal) && proposal === source;

  return (
    <Dialog
      open={open}
      onClose={onClose}
      title="Mise en forme intelligente"
      description="Compare la proposition : rien n'est modifié ni enregistré sans ton accord."
      className="ai-formatting-dialog"
      footer={(
        <>
          <button type="button" className="btn-brutal ghost" onClick={onClose}>
            {loading ? "Annuler la génération" : "Fermer sans appliquer"}
          </button>
          {error && (
            <button type="button" className="btn-brutal ghost" onClick={onRetry}>
              Réessayer
            </button>
          )}
          {error?.code === "AI_CONFIGURATION_REQUIRED" && (
            <button type="button" className="btn-brutal ghost" onClick={onConfigure}>
              Paramètres IA
            </button>
          )}
          {proposal && (
            <button
              type="button"
              className="btn-brutal primary"
              onClick={onApply}
              disabled={unchanged}
            >
              Appliquer à l&apos;éditeur
            </button>
          )}
        </>
      )}
    >
      <div className="ai-formatting-stack">
        <div className="ai-formatting-notice">
          <Icon name="sparkles" size={18} />
          <div>
            <strong>Proposition réversible</strong>
            <p>
              Le texte est transmis à Anthropic. Les références et légendes des
              images privées sont masquées, puis restaurées après validation.
            </p>
            {onOpenHelp && (
              <button type="button" className="help-inline-link" onClick={onOpenHelp}>
                Confidentialité et mise en forme IA
              </button>
            )}
          </div>
        </div>

        <div className="ai-formatting-switcher" role="group" aria-label="Affichage de la comparaison">
          <button
            type="button"
            className={comparisonMode === "preview" ? "is-active" : ""}
            aria-pressed={comparisonMode === "preview"}
            onClick={() => setComparisonMode("preview")}
          >
            Aperçu
          </button>
          <button
            type="button"
            className={comparisonMode === "markdown" ? "is-active" : ""}
            aria-pressed={comparisonMode === "markdown"}
            onClick={() => setComparisonMode("markdown")}
          >
            Markdown
          </button>
        </div>

        <div className="ai-formatting-comparison">
          <section aria-labelledby="ai-format-source-title">
            <header>
              <span id="ai-format-source-title">Texte actuel</span>
              <small>Inchangé</small>
            </header>
            <div className="ai-formatting-preview">
              {comparisonMode === "preview" ? (
                <MarkdownRenderer content={source} imageUrls={imageUrls} />
              ) : (
                <pre>{source}</pre>
              )}
            </div>
          </section>

          <section aria-labelledby="ai-format-proposal-title" aria-busy={loading}>
            <header>
              <span id="ai-format-proposal-title">Proposition IA</span>
              <small>{loading ? "Génération…" : proposal ? "À valider" : "En attente"}</small>
            </header>
            <div className="ai-formatting-preview" aria-live="polite">
              {loading ? (
                <div className="ai-formatting-loading" role="status">
                  <span aria-hidden="true" />
                  <strong>Mise en forme en cours…</strong>
                  <small>La note restera intacte si tu annules.</small>
                </div>
              ) : error ? (
                <div className="ai-formatting-error" role="alert">
                  <strong>Proposition non disponible</strong>
                  <p>{error.message}</p>
                </div>
              ) : comparisonMode === "preview" ? (
                <MarkdownRenderer content={proposal} imageUrls={imageUrls} />
              ) : (
                <pre>{proposal}</pre>
              )}
            </div>
          </section>
        </div>

        {unchanged && (
          <p className="ai-formatting-unchanged" role="status">
            Le texte est déjà structuré : aucune modification n&apos;est proposée.
          </p>
        )}
      </div>
    </Dialog>
  );
}
