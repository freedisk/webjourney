"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Dialog from "@/components/ui/Dialog";
import Icon from "@/components/ui/Icon";

function normalize(value) {
  return (value || "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase();
}

export default function CommandPalette({ open, onClose, commands }) {
  const [query, setQuery] = useState("");
  const [activeIndex, setActiveIndex] = useState(0);
  const inputRef = useRef(null);
  const activeOptionRef = useRef(null);

  const filteredCommands = useMemo(() => {
    const needle = normalize(query.trim());
    if (!needle) return commands;
    return commands.filter((command) =>
      normalize(`${command.label} ${command.description || ""} ${command.keywords || ""}`).includes(needle),
    );
  }, [commands, query]);

  const safeActiveIndex = Math.min(
    activeIndex,
    Math.max(0, filteredCommands.length - 1),
  );

  useEffect(() => {
    if (open) activeOptionRef.current?.scrollIntoView({ block: "nearest" });
  }, [open, query, safeActiveIndex]);

  function closePalette() {
    setQuery("");
    setActiveIndex(0);
    onClose();
  }

  function execute(command) {
    closePalette();
    requestAnimationFrame(() => command?.onSelect?.());
  }

  return (
    <Dialog
      open={open}
      onClose={closePalette}
      title="Palette de commandes"
      description="Rechercher une note ou lancer une action."
      className="command-palette"
      initialFocusRef={inputRef}
      showClose={false}
    >
      <div className="command-search">
        <Icon name="search" size={19} />
        <input
          ref={inputRef}
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          onKeyDown={(event) => {
            if (event.key === "ArrowDown") {
              event.preventDefault();
              setActiveIndex((index) => (index + 1) % Math.max(1, filteredCommands.length));
            }
            if (event.key === "ArrowUp") {
              event.preventDefault();
              setActiveIndex((index) => (index - 1 + Math.max(1, filteredCommands.length)) % Math.max(1, filteredCommands.length));
            }
            if (event.key === "Enter" && filteredCommands[safeActiveIndex]) {
              event.preventDefault();
              execute(filteredCommands[safeActiveIndex]);
            }
          }}
          placeholder="Note, vue, action…"
          aria-label="Rechercher une commande"
          role="combobox"
          aria-autocomplete="list"
          aria-expanded={open}
          aria-controls="command-results"
          aria-activedescendant={filteredCommands[safeActiveIndex]
            ? `command-option-${filteredCommands[safeActiveIndex].id}`
            : undefined}
        />
        <kbd>Échap</kbd>
      </div>

      <div id="command-results" className="command-results" role="listbox" aria-label="Commandes disponibles">
        {filteredCommands.length === 0 ? (
          <p className="command-empty">Aucun résultat. Essaie un autre mot.</p>
        ) : (
          filteredCommands.map((command, index) => (
            <button
              key={command.id}
              id={`command-option-${command.id}`}
              ref={index === safeActiveIndex ? activeOptionRef : undefined}
              type="button"
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
          ))
        )}
      </div>
    </Dialog>
  );
}
