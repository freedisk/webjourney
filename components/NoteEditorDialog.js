"use client";

import { useEffect, useRef } from "react";
import Dialog from "@/components/ui/Dialog";
import NoteContentEditor from "@/components/NoteContentEditor";
import Icon from "@/components/ui/Icon";
import { getEditorViewport } from "@/lib/editor-viewport";

export default function NoteEditorDialog({
  open, creating, title, content, onTitleChange, onContentChange, onSave, onClose,
  pendingImages, onPendingImagesChange, existingImages, imageUrls, busy, preparing,
  progress, imageDisabled, onProcessingChange, onOpenHelp, onSmartFormat, smartFormatBusy,
  status, changed, failed, colors,
}) {
  const titleRef = useRef(null);
  useEffect(() => {
    if (!open || !window.visualViewport) return undefined;
    const viewport = window.visualViewport;
    const overlay = document.querySelector(".note-editor-overlay");
    if (!overlay) return undefined;
    function fitViewport() {
      const touch = navigator.maxTouchPoints > 0 || window.matchMedia("(pointer: coarse)").matches;
      const visible = getEditorViewport(window.innerHeight, window.innerWidth, viewport, { touch });
      if (visible) {
        overlay.style.setProperty("--note-editor-height", visible.height + "px");
        overlay.style.top = visible.top + "px";
      } else {
        overlay.style.removeProperty("--note-editor-height");
        overlay.style.removeProperty("top");
      }
    }
    fitViewport();
    viewport.addEventListener("resize", fitViewport);
    viewport.addEventListener("scroll", fitViewport);
    window.addEventListener("resize", fitViewport);
    return () => {
      viewport.removeEventListener("resize", fitViewport);
      viewport.removeEventListener("scroll", fitViewport);
      window.removeEventListener("resize", fitViewport);
      overlay.style.removeProperty("--note-editor-height");
      overlay.style.removeProperty("top");
    };
  }, [open]);
  return (
    <Dialog
      open={open}
      onClose={onClose}
      title={creating ? "Nouvelle note" : "Modifier la note"}
      className="note-editor-dialog"
      overlayClassName="note-editor-overlay"
      initialFocusRef={titleRef}
      closeLabel="Quitter l’édition"
      closeIcon="arrowLeft"
      showClose={false}
      closeOnBackdrop={!busy}
      headerActions={(
        <><button type="button" className="btn-brutal primary note-editor-save"
          disabled={busy || preparing || !title.trim() || (!creating && !changed)} onClick={onSave}>
          {busy ? "Enregistrement…" : preparing ? "Préparation…" : failed ? "Réessayer" : creating ? "Créer" : "Enregistrer"}
        </button>
        <button type="button" className="btn-brutal ghost note-editor-leave" aria-label="Quitter l’édition" onClick={onClose} disabled={busy || preparing}>
          <span className="editor-close-desktop"><Icon name="close" size={18} /></span>
          <span className="editor-close-mobile"><Icon name="arrowLeft" size={18} /></span>
        </button></>
      )}
    >
      <p className={"note-save-status" + (failed ? " is-error" : "")} role="status" aria-live="polite">{status}</p>
      {failed && <p className="note-save-error" role="alert">Tes modifications sont conservées. Réessaie l’enregistrement.</p>}
      <label htmlFor="note-editor-title" className="note-editor-label">Titre</label>
      <input id="note-editor-title" ref={titleRef} aria-label="Titre de la note"
        className="input-glass note-editor-title" value={title}
        onChange={(event) => onTitleChange(event.target.value)} disabled={busy} placeholder="Titre de la note" />
      <NoteContentEditor
        value={content} onChange={onContentChange}
        pendingImages={pendingImages} onPendingImagesChange={onPendingImagesChange}
        existingImages={existingImages} imageUrls={imageUrls}
        rows={12} minHeight="230px" disabled={busy} imageDisabled={imageDisabled}
        uploadProgress={progress} onProcessingChange={onProcessingChange}
        onOpenHelp={onOpenHelp} onSmartFormat={onSmartFormat} smartFormatBusy={smartFormatBusy}
      />
      <details className="note-editor-colors"><summary>Couleur de la note</summary>{colors}</details>
    </Dialog>
  );
}
