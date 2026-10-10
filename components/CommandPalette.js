"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Dialog from "@/components/ui/Dialog";
import Icon from "@/components/ui/Icon";
import { normalizeNoteSearch, searchNoteIndex } from "@/lib/note-search";

export default function CommandPalette({ open, onClose, commands, noteIndex = [], onOpenNote }) {
  const [query, setQuery] = useState("");
  const [activeIndex, setActiveIndex] = useState(0);
  const [resultLimit, setResultLimit] = useState(20);
  const [scope, setScope] = useState("active");
  const inputRef = useRef(null);
  const activeOptionRef = useRef(null);
  const matches = useMemo(() => searchNoteIndex(noteIndex.filter((note) => scope === "all"
    ? note.scope !== "trash" : (note.scope || "active") === scope), query, {
    excerptCount: query.trim() ? resultLimit : 8,
  }), [noteIndex, query, resultLimit, scope]);
  const visibleNotes = matches.slice(0, query.trim() ? resultLimit : 8);
  const noteCommands = visibleNotes.map((note) => ({
    id: "note-" + note.id, label: note.title,
    description: [note.scope === "archived" ? "Archive" : note.scope === "trash" ? "Corbeille" : null, note.tag, note.excerpt].filter(Boolean).join(" · "),
    icon: "chevron", onSelect: () => onOpenNote?.(note.id),
  }));
  const filteredCommands = useMemo(() => {
    const needle = normalizeNoteSearch(query.trim());
    return commands.filter((command) => !needle
      || normalizeNoteSearch([command.label, command.description, command.keywords].join(" ")).includes(needle));
  }, [commands, query]);
  const options = [...noteCommands, ...filteredCommands];
  const safeActiveIndex = Math.min(activeIndex, Math.max(0, options.length - 1));
  const activeOption = options[safeActiveIndex];

  useEffect(() => {
    if (open) activeOptionRef.current?.scrollIntoView({ block: "nearest" });
  }, [open, query, safeActiveIndex, resultLimit]);

  function execute(command) {
    onClose();
    requestAnimationFrame(() => requestAnimationFrame(() => command?.onSelect?.()));
  }

  function renderOption(command, index) {
    return (
      <button
        key={command.id}
        id={"command-option-" + command.id}
        ref={index === safeActiveIndex ? activeOptionRef : undefined}
        type="button"
        tabIndex={-1}
        role="option"
        aria-selected={index === safeActiveIndex}
        className={index === safeActiveIndex ? "is-active" : ""}
        onMouseEnter={() => setActiveIndex(index)}
        onClick={() => execute(command)}
      >
        <span className="command-icon"><Icon name={command.icon || "command"} size={17} /></span>
        <span className="command-label">
          <strong>{command.label}</strong>
          {command.description && <small>{command.description}</small>}
        </span>
        {command.shortcut && <kbd>{command.shortcut}</kbd>}
      </button>
    );
  }

  return (
    <Dialog
      open={open}
      onClose={onClose}
      title="Rechercher"
      description="Choisis où rechercher. Les notes à la corbeille restent récupérables."
      className="command-palette"
      initialFocusRef={inputRef}
      showClose={false}
    >
      <div className="command-search">
        <Icon name="search" size={19} />
        <input
          ref={inputRef}
          value={query}
          onChange={(event) => { setQuery(event.target.value); setActiveIndex(0); setResultLimit(20); }}
          onKeyDown={(event) => {
            if (event.key === "ArrowDown" || event.key === "ArrowUp") {
              event.preventDefault();
              const delta = event.key === "ArrowDown" ? 1 : -1;
              setActiveIndex((index) => (index + delta + Math.max(1, options.length)) % Math.max(1, options.length));
            }
            if (event.key === "Enter" && activeOption) {
              event.preventDefault();
              execute(activeOption);
            }
          }}
          placeholder="Titre, contenu, tag ou action…"
          aria-label="Rechercher dans toutes les notes"
          role="combobox"
          aria-autocomplete="list"
          aria-expanded={open}
          aria-controls="command-results"
          aria-activedescendant={activeOption ? "command-option-" + activeOption.id : undefined}
        />
        <button type="button" className="command-close" onClick={onClose} aria-label="Fermer la recherche">Échap</button>
      </div>
      <div className="search-scope-controls" role="group" aria-label="Périmètre de recherche">
        {[["active", "Notes"], ["all", "Notes + archives"], ["trash", "Corbeille"]].map(([id, label]) => (
          <button type="button" key={id} aria-pressed={scope === id} onClick={() => { setScope(id); setActiveIndex(0); setResultLimit(20); }}>{label}</button>
        ))}
      </div>
      <p className="command-result-count" role="status" aria-live="polite">
        {query.trim() ? matches.length + " note(s) trouvée(s)" : "Notes récentes"}
      </p>
      <div id="command-results" className="command-results" role="listbox" aria-label="Notes et actions">
        <div role="group" aria-label={query.trim() ? "Notes trouvées" : "Notes récentes"}>
          <h3 className="command-group-title">{query.trim() ? "Notes" : "Notes récentes"}</h3>
          {noteCommands.map(renderOption)}
          {noteCommands.length === 0 && <p className="command-empty">Aucune note trouvée.</p>}
        </div>
        {filteredCommands.length > 0 && (
          <div role="group" aria-label="Actions">
            <h3 className="command-group-title">Actions</h3>
            {filteredCommands.map((command, index) => renderOption(command, index + noteCommands.length))}
          </div>
        )}
      </div>
      <div className="command-result-tools">
        {query.trim() && matches.length > resultLimit && (
          <button type="button" className="btn-brutal ghost" onClick={() => setResultLimit((limit) => limit + 20)}>
            Afficher les autres résultats ({matches.length - resultLimit})
          </button>
        )}
        {query && <button type="button" className="btn-brutal ghost" onClick={() => { setQuery(""); setActiveIndex(0); setResultLimit(20); inputRef.current?.focus(); }}>Effacer la recherche</button>}
      </div>
    </Dialog>
  );
}
