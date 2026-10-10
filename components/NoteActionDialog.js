"use client";

import { useState } from "react";
import Dialog from "@/components/ui/Dialog";
import Icon from "@/components/ui/Icon";

export default function NoteActionDialog({ open, onClose, note, actions, tags, onAddTag, onManageTags, sizeControls, busy, readOnly = false }) {
  const [choosingTag, setChoosingTag] = useState(false);
  function execute(action) {
    onClose();
    requestAnimationFrame(() => requestAnimationFrame(() => action()));
  }
  return (
    <Dialog open={open} onClose={onClose} title={choosingTag ? "Ajouter un tag" : "Actions de la note"} description={note?.titre} className="note-actions-dialog">
      {choosingTag && !readOnly ? (
        <div className="note-action-options">
          <button type="button" className="btn-brutal ghost" onClick={() => setChoosingTag(false)}>← Actions</button>
          {tags.length === 0 && <p>Aucun tag disponible pour cette note.</p>}
          {tags.map((tag) => <button type="button" key={tag.id} disabled={busy} onClick={() => execute(() => onAddTag(tag.id))}><span className="note-action-tag-dot" style={{ background: tag.couleur }} />{tag.nom}</button>)}
          <button type="button" onClick={() => execute(onManageTags)}>Gérer les tags</button>
        </div>
      ) : (
        <div className="note-action-options">
          {actions.filter((action) => !action.danger).map((action) => <button key={action.id} type="button" disabled={busy || action.disabled} onClick={() => execute(action.onSelect)}><Icon name={action.icon || "chevron"} size={18} /><span>{action.label}{action.description && <small>{action.description}</small>}</span></button>)}
          {!readOnly && <button type="button" disabled={busy} onClick={() => setChoosingTag(true)}><Icon name="tags" size={18} />Ajouter un tag</button>}
          <div className="note-action-reading-size"><span>Taille du texte</span>{sizeControls}</div>
          {actions.filter((action) => action.danger).map((action) => <button key={action.id} type="button" disabled={busy || action.disabled} className="is-danger" onClick={() => execute(action.onSelect)}><Icon name={action.icon || "close"} size={18} />{action.label}</button>)}
        </div>
      )}
    </Dialog>
  );
}
