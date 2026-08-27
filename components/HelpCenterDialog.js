"use client";

import { useMemo, useRef, useState } from "react";
import Dialog from "@/components/ui/Dialog";
import EmptyState from "@/components/ui/EmptyState";
import Icon from "@/components/ui/Icon";
import {
  filterHelpSections,
  HELP_PROGRESS_KEY,
  HELP_QUICK_START_STEPS,
  HELP_SECTIONS,
  HELP_SHORTCUTS,
  sanitizeHelpProgress,
} from "@/lib/help-content";

const DEFAULT_PROGRESS = Object.freeze({ completed: [], checklistHidden: false });

function readProgress() {
  try {
    return sanitizeHelpProgress(JSON.parse(localStorage.getItem(HELP_PROGRESS_KEY) || "null"));
  } catch {
    return { ...DEFAULT_PROGRESS };
  }
}

function writeProgress(progress) {
  try {
    localStorage.setItem(HELP_PROGRESS_KEY, JSON.stringify(progress));
  } catch {
    // La checklist reste utilisable même si le stockage navigateur est bloqué.
  }
}

export default function HelpCenterDialog({
  open,
  onClose,
  initialSection = "quick-start",
  onCreateNote,
  onOpenAISettings,
}) {
  const searchRef = useRef(null);
  const requestedSection = HELP_SECTIONS.some((section) => section.id === initialSection)
    ? initialSection
    : "quick-start";
  const [query, setQuery] = useState("");
  const [activeSectionId, setActiveSectionId] = useState(requestedSection);
  const [progress, setProgress] = useState(readProgress);

  const visibleSections = useMemo(() => filterHelpSections(query), [query]);
  const activeSection = visibleSections.find((section) => section.id === activeSectionId)
    || visibleSections[0]
    || null;
  const completedCount = progress.completed.length;

  function updateProgress(nextProgress) {
    const cleanProgress = sanitizeHelpProgress(nextProgress);
    setProgress(cleanProgress);
    writeProgress(cleanProgress);
  }

  function toggleStep(stepId) {
    const completed = progress.completed.includes(stepId)
      ? progress.completed.filter((id) => id !== stepId)
      : [...progress.completed, stepId];
    updateProgress({ ...progress, completed });
  }

  function launchAction(action) {
    onClose();
    requestAnimationFrame(() => action?.());
  }

  return (
    <Dialog
      open={open}
      onClose={onClose}
      title="Centre d’aide"
      description="Fonctionnalités, usages, confidentialité et réglages de Capsule."
      className="help-center-dialog"
      initialFocusRef={searchRef}
    >
      <div className="help-center-shell">
        <div className="help-search">
          <Icon name="search" size={18} />
          <input
            ref={searchRef}
            type="search"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Rechercher : image, IA, partage…"
            aria-label="Rechercher dans le centre d’aide"
          />
          {query && (
            <button type="button" onClick={() => setQuery("")} aria-label="Effacer la recherche d’aide">
              Effacer
            </button>
          )}
        </div>

        <p className="help-result-count" role="status" aria-live="polite">
          {visibleSections.length} rubrique{visibleSections.length > 1 ? "s" : ""}
        </p>

        {activeSection ? (
          <div className="help-center-layout">
            <nav className="help-navigation" aria-label="Rubriques d’aide">
              {visibleSections.map((section) => (
                <button
                  key={section.id}
                  type="button"
                  className={activeSection.id === section.id ? "is-active" : ""}
                  aria-current={activeSection.id === section.id ? "page" : undefined}
                  onClick={() => setActiveSectionId(section.id)}
                >
                  <span className="help-navigation-icon"><Icon name={section.icon} size={17} /></span>
                  <span>{section.title}</span>
                </button>
              ))}
            </nav>

            <article className="help-article" aria-labelledby={`help-section-${activeSection.id}`}>
              <header className="help-article-header">
                <span><Icon name={activeSection.icon} size={21} /></span>
                <div>
                  <h3 id={`help-section-${activeSection.id}`}>{activeSection.title}</h3>
                  <p>{activeSection.summary}</p>
                </div>
              </header>

              {activeSection.id === "quick-start" && (
                <section className="help-quick-start" aria-labelledby="help-quick-start-title">
                  <div className="help-progress-heading">
                    <div>
                      <h4 id="help-quick-start-title">Mon parcours</h4>
                      <p>{completedCount}/{HELP_QUICK_START_STEPS.length} repères cochés</p>
                    </div>
                    <button
                      type="button"
                      className="help-text-button"
                      onClick={() => updateProgress({
                        ...progress,
                        checklistHidden: !progress.checklistHidden,
                      })}
                    >
                      {progress.checklistHidden ? "Afficher" : "Masquer"}
                    </button>
                  </div>
                  <progress
                    value={completedCount}
                    max={HELP_QUICK_START_STEPS.length}
                    aria-label={`${completedCount} étapes de démarrage sur ${HELP_QUICK_START_STEPS.length}`}
                  />

                  {!progress.checklistHidden && (
                    <div className="help-checklist">
                      {HELP_QUICK_START_STEPS.map((step) => (
                        <div key={step.id} className={progress.completed.includes(step.id) ? "is-complete" : ""}>
                          <label>
                            <input
                              type="checkbox"
                              checked={progress.completed.includes(step.id)}
                              onChange={() => toggleStep(step.id)}
                            />
                            <span>
                              <strong>{step.title}</strong>
                              <small>{step.description}</small>
                            </span>
                          </label>
                          <button
                            type="button"
                            onClick={() => {
                              setQuery("");
                              setActiveSectionId(step.sectionId);
                            }}
                          >
                            Voir le guide
                          </button>
                        </div>
                      ))}
                      {completedCount > 0 && (
                        <button
                          type="button"
                          className="help-text-button help-reset-progress"
                          onClick={() => updateProgress({ ...progress, completed: [] })}
                        >
                          Réinitialiser la progression
                        </button>
                      )}
                    </div>
                  )}

                  <div className="help-primary-actions">
                    <button type="button" className="btn-brutal primary" onClick={() => launchAction(onCreateNote)}>
                      Créer une note
                    </button>
                    <button type="button" className="btn-brutal ghost" onClick={() => launchAction(onOpenAISettings)}>
                      Configurer l’IA
                    </button>
                  </div>
                </section>
              )}

              {activeSection.id === "shortcuts" && (
                <div className="help-shortcuts-table">
                  <table>
                    <caption className="sr-only">Raccourcis clavier de Capsule</caption>
                    <tbody>
                      {HELP_SHORTCUTS.map(([shortcut, action]) => (
                        <tr key={shortcut}>
                          <th scope="row"><kbd>{shortcut}</kbd></th>
                          <td>{action}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                  <p>Les raccourcis sont suspendus pendant la saisie dans un champ et derrière un dialogue.</p>
                </div>
              )}

              {activeSection.blocks.map((block) => (
                <section key={block.title} className="help-content-block">
                  <h4>{block.title}</h4>
                  {block.body && <p>{block.body}</p>}
                  {block.bullets && (
                    <ul>
                      {block.bullets.map((bullet) => <li key={bullet}>{bullet}</li>)}
                    </ul>
                  )}
                </section>
              ))}

              {activeSection.id === "notes" && (
                <button type="button" className="btn-brutal primary help-section-action" onClick={() => launchAction(onCreateNote)}>
                  Créer une note
                </button>
              )}
              {activeSection.id === "ai" && (
                <button type="button" className="btn-brutal primary help-section-action" onClick={() => launchAction(onOpenAISettings)}>
                  Ouvrir les paramètres IA
                </button>
              )}

              <aside className="help-local-note">
                <Icon name="key" size={16} />
                <span>L’aide est embarquée dans Capsule. Seules les cases du démarrage rapide peuvent être mémorisées localement.</span>
              </aside>
            </article>
          </div>
        ) : (
          <EmptyState
            compact
            icon="search"
            title="Aucune rubrique trouvée"
            description="Essaie un autre terme ou efface la recherche."
            actionLabel="Effacer la recherche"
            onAction={() => setQuery("")}
          />
        )}
      </div>
    </Dialog>
  );
}
