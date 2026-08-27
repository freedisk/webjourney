"use client";

import { useRef, useState } from "react";
import PrintableNote from "@/components/PrintableNote";
import Dialog from "@/components/ui/Dialog";
import Icon from "@/components/ui/Icon";
import {
  buildPrintDocumentTitle,
  getMissingPrintImageIds,
  preparePrintableImages,
  PrintPreparationError,
} from "@/lib/note-printing";

function waitForPaint() {
  return new Promise((resolve) => {
    window.requestAnimationFrame(() => window.requestAnimationFrame(resolve));
  });
}

export default function PrintNoteDialog({
  open,
  note,
  tags = [],
  imageUrls = {},
  onClose,
  onRefreshImages,
}) {
  const documentRef = useRef(null);
  const printButtonRef = useRef(null);
  const preparationControllerRef = useRef(null);
  const [preparing, setPreparing] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [progress, setProgress] = useState({ completed: 0, total: 0, percent: 0 });
  const [error, setError] = useState(null);

  const missingImageIds = getMissingPrintImageIds(note?.contenu, imageUrls);

  async function refreshImages() {
    if (!onRefreshImages || refreshing || preparing) return;
    setRefreshing(true);
    setError(null);
    try {
      const refreshed = await onRefreshImages();
      if (refreshed === false) {
        throw new Error("Image refresh failed");
      }
    } catch {
      setError("Impossible d'actualiser les images privées. Vérifie la connexion puis réessaie.");
    } finally {
      setRefreshing(false);
    }
  }

  function cancelPreparation() {
    preparationControllerRef.current?.abort(new PrintPreparationError(
      "PRINT_PREPARATION_CANCELLED",
      "Préparation annulée. Tu peux réessayer quand tu le souhaites.",
    ));
  }

  async function printNote() {
    if (preparing) return;
    setError(null);

    if (missingImageIds.length > 0) {
      setError(
        `${missingImageIds.length} image${missingImageIds.length > 1 ? "s privées sont" : " privée est"} indisponible${missingImageIds.length > 1 ? "s" : ""}. Actualise les images avant d'imprimer.`,
      );
      return;
    }

    if (typeof window.print !== "function") {
      setError("L'impression n'est pas disponible dans ce navigateur.");
      return;
    }

    setPreparing(true);
    setProgress({ completed: 0, total: 0, percent: 0 });
    const previousTitle = document.title;
    const preparationController = new AbortController();
    preparationControllerRef.current = preparationController;

    try {
      await preparePrintableImages(documentRef.current, {
        onProgress: setProgress,
        signal: preparationController.signal,
      });
      document.title = buildPrintDocumentTitle(note?.titre, note?.created_at);
      document.body.classList.add("capsule-printing");
      await waitForPaint();
      window.print();
    } catch (printError) {
      setError(printError?.message || "Le document n'a pas pu être préparé pour l'impression.");
    } finally {
      document.body.classList.remove("capsule-printing");
      document.title = previousTitle;
      preparationControllerRef.current = null;
      setPreparing(false);
    }
  }

  const progressLabel = progress.total > 0
    ? `Préparation des images ${progress.completed}/${progress.total}`
    : "Préparation du document…";

  return (
    <Dialog
      open={open}
      onClose={() => { if (preparing) cancelPreparation(); else onClose?.(); }}
      title="Imprimer / PDF"
      description="Vérifie la version enregistrée avant d’ouvrir le dialogue système."
      className="print-note-dialog"
      overlayClassName="print-note-overlay"
      initialFocusRef={printButtonRef}
      closeOnBackdrop={!preparing}
      showClose={!preparing}
      footer={(
        <div className="print-note-actions">
          <button
            type="button"
            className="btn-brutal ghost"
            onClick={preparing ? cancelPreparation : onClose}
            disabled={refreshing}
          >
            {preparing ? "Annuler la préparation" : "Annuler"}
          </button>
          {error && onRefreshImages && (
            <button type="button" className="btn-brutal ghost" onClick={refreshImages} disabled={preparing || refreshing}>
              {refreshing ? "Actualisation…" : "Actualiser les images"}
            </button>
          )}
          <button
            ref={printButtonRef}
            type="button"
            className="btn-brutal primary print-note-submit"
            onClick={printNote}
            disabled={preparing || refreshing}
          >
            <Icon name="printer" size={17} />
            {preparing ? progressLabel : "Imprimer / PDF"}
          </button>
        </div>
      )}
    >
      <div className="print-note-preflight">
        <div className="print-note-guidance">
          <Icon name="printer" size={20} />
          <div>
            <strong>Impression système</strong>
            <p>Choisis une imprimante ou l’option PDF proposée par ton appareil.</p>
          </div>
        </div>
        <div className="print-note-privacy">
          <Icon name="key" size={18} />
          <p>Un PDF enregistré devient une copie extérieure à Capsule : protège-le comme la note d’origine.</p>
        </div>
        {preparing && (
          <div className="print-note-progress" role="status" aria-live="polite">
            <span>{progressLabel}</span>
            <progress value={progress.percent} max="100" aria-label={progressLabel} />
          </div>
        )}
        {error && <p className="print-note-error" role="alert">{error}</p>}
      </div>

      <p className="print-note-preview-label">Aperçu du document</p>
      <div className="print-note-preview-frame">
        <PrintableNote ref={documentRef} note={note} tags={tags} imageUrls={imageUrls} />
      </div>
    </Dialog>
  );
}
