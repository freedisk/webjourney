"use client";

import { forwardRef } from "react";
import MarkdownRenderer from "@/components/MarkdownRenderer";
import { formatPrintDate } from "@/lib/note-printing";

const PrintableNote = forwardRef(function PrintableNote({ note, tags = [], imageUrls = {} }, ref) {
  const createdAt = formatPrintDate(note?.created_at);

  return (
    <article ref={ref} className="print-note-document" aria-label={`Document imprimable : ${note?.titre || "Note"}`}>
      <header className="print-note-document-header">
        <div className="print-note-brand" aria-label="Capsule">
          <strong>Capsule</strong>
          <span>Note personnelle</span>
        </div>
        <h1>{note?.titre || "Sans titre"}</h1>
        <div className="print-note-metadata">
          <time dateTime={note?.created_at || undefined}>Créée le {createdAt}</time>
          {tags.length > 0 && (
            <ul aria-label="Tags de la note">
              {tags.map((tag) => (
                <li key={tag.id} style={{ "--print-tag-color": tag.couleur || "#6d28d9" }}>
                  {tag.nom}
                </li>
              ))}
            </ul>
          )}
        </div>
      </header>

      <section className="print-note-content" aria-label="Contenu de la note">
        {note?.contenu ? (
          <MarkdownRenderer content={note.contenu} imageUrls={imageUrls} interactive={false} />
        ) : (
          <p className="print-note-empty">Cette note ne contient pas encore de texte.</p>
        )}
      </section>

      <footer className="print-note-document-footer">
        Document préparé avec Capsule
      </footer>
    </article>
  );
});

export default PrintableNote;
