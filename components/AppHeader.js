"use client";

import { useEffect, useRef, useState } from "react";
import Icon from "@/components/ui/Icon";
import IconButton from "@/components/ui/IconButton";
import ViewSwitcher from "@/components/ViewSwitcher";

export default function AppHeader({
  noteCount,
  viewMode,
  onViewChange,
  onNewNote,
  onOpenCommand,
  tagsOpen,
  onToggleTags,
  onOpenStats,
  onOpenAISettings,
  isDark,
  onToggleTheme,
  onOpenHelp,
  email,
  onLogout,
  busy,
}) {
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef(null);
  const menuButtonRef = useRef(null);

  useEffect(() => {
    if (!menuOpen) return undefined;
    function closeMenu(event) {
      if (!menuRef.current?.contains(event.target)) setMenuOpen(false);
    }
    function closeWithEscape(event) {
      if (event.key === "Escape") {
        event.preventDefault();
        setMenuOpen(false);
        requestAnimationFrame(() => menuButtonRef.current?.focus());
      }
    }
    document.addEventListener("pointerdown", closeMenu);
    document.addEventListener("keydown", closeWithEscape);
    return () => {
      document.removeEventListener("pointerdown", closeMenu);
      document.removeEventListener("keydown", closeWithEscape);
    };
  }, [menuOpen]);

  return (
    <header className="app-header glass-card">
      <div className="app-brand">
        <div>
          <h1 className="logo-capsule">CAPSULE</h1>
          <span className="app-brand-subtitle">Notes personnelles</span>
        </div>
        <span className="note-count" aria-label={`${noteCount} note${noteCount !== 1 ? "s" : ""}`}>
          {noteCount}
        </span>
      </div>

      <div className="app-header-navigation">
        <ViewSwitcher value={viewMode} onChange={onViewChange} />
      </div>

      <div className="app-header-actions">
        <button
          type="button"
          className="command-trigger"
          onClick={onOpenCommand}
          aria-label="Ouvrir la palette de commandes"
        >
          <Icon name="search" size={17} />
          <span>Rechercher</span>
          <kbd>⌘ K</kbd>
        </button>
        <button
          type="button"
          className="btn-brutal primary new-note-button"
          onClick={onNewNote}
          disabled={busy}
          aria-label="Nouvelle note"
        >
          <Icon name="plus" size={17} />
          <span>Nouvelle note</span>
        </button>
        <IconButton
          label="Statistiques"
          icon="chart"
          onClick={onOpenStats}
          className="header-desktop-icon"
        />
        <IconButton
          label={isDark ? "Activer le thème clair" : "Activer le thème sombre"}
          icon={isDark ? "sun" : "moon"}
          onClick={onToggleTheme}
          className="header-desktop-icon"
        />

        <div className="header-menu" ref={menuRef}>
          <IconButton
            ref={menuButtonRef}
            label="Plus d'actions"
            icon="menu"
            aria-expanded={menuOpen}
            aria-haspopup="menu"
            aria-controls="header-actions-menu"
            onClick={() => setMenuOpen((open) => !open)}
          />
          {menuOpen && (
            <div id="header-actions-menu" className="header-menu-popover" role="menu">
              <div className="header-menu-account">
                <span>Connecté</span>
                <strong>{email}</strong>
              </div>
              <button type="button" role="menuitem" onClick={() => { onToggleTags(); setMenuOpen(false); }}>
                <Icon name="tags" size={16} />
                {tagsOpen ? "Fermer les tags" : "Gérer les tags"}
              </button>
              <button type="button" role="menuitem" onClick={() => { onOpenStats(); setMenuOpen(false); }}>
                <Icon name="chart" size={16} /> Statistiques
              </button>
              <button type="button" role="menuitem" onClick={() => { onOpenAISettings(); setMenuOpen(false); }}>
                <Icon name="sparkles" size={16} /> Paramètres IA
              </button>
              <button type="button" role="menuitem" onClick={() => { onToggleTheme(); setMenuOpen(false); }}>
                <Icon name={isDark ? "sun" : "moon"} size={16} />
                {isDark ? "Thème clair" : "Thème sombre"}
              </button>
              <button type="button" role="menuitem" onClick={() => { onOpenHelp(); setMenuOpen(false); }}>
                <Icon name="help" size={16} /> Raccourcis
              </button>
              <button type="button" role="menuitem" className="is-danger" onClick={() => { setMenuOpen(false); onLogout(); }}>
                <Icon name="logout" size={16} /> Déconnexion
              </button>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}
