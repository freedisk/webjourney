"use client";

// Page principale — List view split panel, tags colorés, recherche, design brutalism + glassmorphism
import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";

// Couleurs de fond prédéfinies pour les notes (pastels clair/sombre)
const COULEURS_NOTES = [
  { nom: "Aucune", hex: null },
  { nom: "Jaune doux", hex: "#fef9c3", hexDark: "#3d3a20" },
  { nom: "Vert menthe", hex: "#dcfce7", hexDark: "#1a3326" },
  { nom: "Bleu ciel", hex: "#dbeafe", hexDark: "#1a2640" },
  { nom: "Rose poudré", hex: "#fce7f3", hexDark: "#3d1a2e" },
  { nom: "Lavande", hex: "#ede9fe", hexDark: "#2a1f4d" },
  { nom: "Pêche", hex: "#ffedd5", hexDark: "#3d2a1a" },
  { nom: "Gris perle", hex: "#f1f5f9", hexDark: "#1e2430" },
  { nom: "Rouge crème", hex: "#fef2f2", hexDark: "#3d1f1f" },
];

// Couleurs prédéfinies pour les tags
const COULEURS_TAGS = [
  { nom: "Rouge", hex: "#ef4444" },
  { nom: "Orange", hex: "#f59e0b" },
  { nom: "Vert", hex: "#22c55e" },
  { nom: "Bleu", hex: "#3b82f6" },
  { nom: "Violet", hex: "#8b5cf6" },
  { nom: "Rose", hex: "#ec4899" },
  { nom: "Gris", hex: "#6b7280" },
  { nom: "Cyan", hex: "#06b6d4" },
];

export default function Home() {
  const router = useRouter();
  const [utilisateur, setUtilisateur] = useState(null);
  const [notes, setNotes] = useState([]);
  const [titre, setTitre] = useState("");
  const [contenu, setContenu] = useState("");
  const [couleurNote, setCouleurNote] = useState(null);
  const [chargement, setChargement] = useState(true);
  const [erreur, setErreur] = useState(null);
  const [succes, setSucces] = useState(null);
  const [sombre, setSombre] = useState(false);

  // Édition inline
  const [editionId, setEditionId] = useState(null);
  const [editionTitre, setEditionTitre] = useState("");
  const [editionContenu, setEditionContenu] = useState("");
  const [editionCouleur, setEditionCouleur] = useState(null);

  // Confirmation de suppression
  const [confirmSuppId, setConfirmSuppId] = useState(null);

  // Recherche instantanée
  const [recherche, setRecherche] = useState("");

  // --- Tags ---
  const [tags, setTags] = useState([]);
  const [notesTags, setNotesTags] = useState({});
  const [panneauTagsOuvert, setPanneauTagsOuvert] = useState(false);
  const [nouveauTagNom, setNouveauTagNom] = useState("");
  const [nouveauTagCouleur, setNouveauTagCouleur] = useState(COULEURS_TAGS[0].hex);
  const [confirmSuppTagId, setConfirmSuppTagId] = useState(null);
  const [dropdownTagNoteId, setDropdownTagNoteId] = useState(null);
  const dropdownRef = useRef(null);
  const [filtreTagId, setFiltreTagId] = useState(null);

  // --- Split panel ---
  const [selectedNoteId, setSelectedNoteId] = useState(null);
  const [triAscendant, setTriAscendant] = useState(false);
  const [mobileDetail, setMobileDetail] = useState(false);

  // --- Résumé IA ---
  const [resumes, setResumes] = useState({});

  // Obtenir la couleur de fond d'une note selon le thème actuel
  function getCouleurFond(couleur) {
    if (!couleur) return undefined;
    const entry = COULEURS_NOTES.find((c) => c.hex === couleur);
    if (entry && sombre) return entry.hexDark;
    return couleur;
  }

  // Normaliser une chaîne : minuscule + sans accents (pour la recherche)
  function normaliser(str) {
    return (str || "").normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();
  }

  // Filtrer et trier les notes
  const notesFiltrees = notes
    .filter((note) => {
      if (recherche.trim()) {
        const terme = normaliser(recherche);
        const matchTexte = normaliser(note.titre).includes(terme) || normaliser(note.contenu).includes(terme);
        if (!matchTexte) return false;
      }
      if (filtreTagId) {
        const tagsDeLaNote = notesTags[note.id] || [];
        if (!tagsDeLaNote.includes(filtreTagId)) return false;
      }
      return true;
    })
    .sort((a, b) => {
      const dateA = new Date(a.created_at);
      const dateB = new Date(b.created_at);
      return triAscendant ? dateA - dateB : dateB - dateA;
    });

  // Note actuellement sélectionnée
  const noteSelectionnee = selectedNoteId ? notes.find((n) => n.id === selectedNoteId) : null;

  // Vérifier la session et charger les données au montage
  useEffect(() => {
    setSombre(document.documentElement.classList.contains("dark"));

    async function init() {
      const { data: { user } } = await supabase.auth.getUser();

      if (!user) {
        router.push("/login");
        return;
      }

      setUtilisateur(user);
      await Promise.all([
        chargerNotes(user.id),
        chargerTags(user.id),
        chargerNotesTags(),
      ]);
      setChargement(false);
    }

    init();
  }, [router]);

  // Masquer le message de succès après 3 secondes
  useEffect(() => {
    if (!succes) return;
    const timer = setTimeout(() => setSucces(null), 3000);
    return () => clearTimeout(timer);
  }, [succes]);

  // Fermer le dropdown de tags au clic extérieur
  useEffect(() => {
    function handleClickExterieur(e) {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target)) {
        setDropdownTagNoteId(null);
      }
    }
    document.addEventListener("mousedown", handleClickExterieur);
    return () => document.removeEventListener("mousedown", handleClickExterieur);
  }, []);

  // Basculer le thème sombre/clair
  function toggleTheme() {
    const isDark = !sombre;
    setSombre(isDark);
    document.documentElement.classList.toggle("dark", isDark);
    localStorage.setItem("theme", isDark ? "dark" : "light");
  }

  // === CHARGEMENT DES DONNÉES ===

  async function chargerNotes(userId) {
    const { data, error } = await supabase
      .from("notes")
      .select("*")
      .eq("user_id", userId)
      .order("created_at", { ascending: false });

    if (error) {
      setErreur("Impossible de charger les notes : " + error.message);
      return;
    }
    setNotes(data);
  }

  async function chargerTags(userId) {
    const { data, error } = await supabase
      .from("tags")
      .select("*")
      .eq("user_id", userId)
      .order("nom");

    if (error) {
      setErreur("Impossible de charger les tags : " + error.message);
      return;
    }
    setTags(data);
  }

  async function chargerNotesTags() {
    const { data, error } = await supabase
      .from("notes_tags")
      .select("*");

    if (error) {
      setErreur("Impossible de charger les associations : " + error.message);
      return;
    }

    const map = {};
    for (const row of data) {
      if (!map[row.note_id]) map[row.note_id] = [];
      map[row.note_id].push(row.tag_id);
    }
    setNotesTags(map);
  }

  // === SÉLECTION DE NOTE (avec protection édition) ===

  function selectionnerNote(noteId) {
    if (editionId) {
      const note = notes.find((n) => n.id === selectedNoteId);
      const titreModifie = note && editionTitre !== note.titre;
      const contenuModifie = note && editionContenu !== (note.contenu || "");
      const couleurModifiee = note && editionCouleur !== (note.couleur || null);
      if (titreModifie || contenuModifie || couleurModifiee) {
        if (!window.confirm("Tu as des modifications non sauvegardées. Changer de note quand même ?")) {
          return;
        }
      }
      annulerEdition();
    }
    setSelectedNoteId(noteId);
    setConfirmSuppId(null);
    setMobileDetail(true);
  }

  // Retour à la liste sur mobile
  function retourListe() {
    if (editionId) {
      const note = notes.find((n) => n.id === selectedNoteId);
      const titreModifie = note && editionTitre !== note.titre;
      const contenuModifie = note && editionContenu !== (note.contenu || "");
      const couleurModifiee = note && editionCouleur !== (note.couleur || null);
      if (titreModifie || contenuModifie || couleurModifiee) {
        if (!window.confirm("Tu as des modifications non sauvegardées. Revenir quand même ?")) {
          return;
        }
      }
      annulerEdition();
    }
    setMobileDetail(false);
  }

  // === CRUD NOTES ===

  async function ajouterNote(e) {
    e.preventDefault();
    setErreur(null);
    if (!titre.trim()) return;

    const { error } = await supabase.from("notes").insert({
      titre: titre.trim(),
      contenu: contenu.trim(),
      couleur: couleurNote,
      user_id: utilisateur.id,
    });

    if (error) {
      setErreur("Erreur lors de l'ajout : " + error.message);
      return;
    }

    setTitre("");
    setContenu("");
    setCouleurNote(null);
    setSucces("Note ajoutée !");
    await chargerNotes(utilisateur.id);
  }

  async function supprimerNote(noteId) {
    setErreur(null);
    const { error } = await supabase.from("notes").delete().eq("id", noteId);

    if (error) {
      setErreur("Erreur lors de la suppression : " + error.message);
      return;
    }

    setConfirmSuppId(null);
    // Désélectionner si c'est la note active
    if (selectedNoteId === noteId) {
      setSelectedNoteId(null);
      setMobileDetail(false);
    }
    setSucces("Note supprimée.");
    await Promise.all([chargerNotes(utilisateur.id), chargerNotesTags()]);
  }

  async function dupliquerNote(note) {
    setErreur(null);
    const { data, error } = await supabase.from("notes").insert({
      titre: "Copie de — " + note.titre,
      contenu: note.contenu,
      couleur: note.couleur,
      user_id: utilisateur.id,
    }).select();

    if (error) {
      setErreur("Erreur lors de la duplication : " + error.message);
      return;
    }

    const tagsOriginaux = notesTags[note.id] || [];
    if (tagsOriginaux.length > 0 && data && data[0]) {
      await supabase.from("notes_tags").insert(
        tagsOriginaux.map((tagId) => ({ note_id: data[0].id, tag_id: tagId }))
      );
      await chargerNotesTags();
    }

    setSucces("Note dupliquée !");
    await chargerNotes(utilisateur.id);
  }

  function commencerEdition(note) {
    setEditionId(note.id);
    setEditionTitre(note.titre);
    setEditionContenu(note.contenu || "");
    setEditionCouleur(note.couleur || null);
    setConfirmSuppId(null);
  }

  function annulerEdition() {
    setEditionId(null);
    setEditionTitre("");
    setEditionContenu("");
    setEditionCouleur(null);
  }

  async function sauvegarderEdition(noteId) {
    setErreur(null);
    if (!editionTitre.trim()) return;

    const { error } = await supabase
      .from("notes")
      .update({ titre: editionTitre.trim(), contenu: editionContenu.trim(), couleur: editionCouleur })
      .eq("id", noteId);

    if (error) {
      setErreur("Erreur lors de la modification : " + error.message);
      return;
    }

    setEditionId(null);
    setSucces("Note modifiée !");
    await chargerNotes(utilisateur.id);
  }

  // === CRUD TAGS ===

  async function creerTag(e) {
    e.preventDefault();
    setErreur(null);
    if (!nouveauTagNom.trim()) return;

    const { error } = await supabase.from("tags").insert({
      nom: nouveauTagNom.trim(),
      couleur: nouveauTagCouleur,
      user_id: utilisateur.id,
    });

    if (error) {
      setErreur("Erreur lors de la création du tag : " + error.message);
      return;
    }

    setNouveauTagNom("");
    setNouveauTagCouleur(COULEURS_TAGS[0].hex);
    setSucces("Tag créé !");
    await chargerTags(utilisateur.id);
  }

  async function supprimerTag(tagId) {
    setErreur(null);
    const { error } = await supabase.from("tags").delete().eq("id", tagId);

    if (error) {
      setErreur("Erreur lors de la suppression du tag : " + error.message);
      return;
    }

    setConfirmSuppTagId(null);
    if (filtreTagId === tagId) setFiltreTagId(null);
    setSucces("Tag supprimé.");
    await Promise.all([chargerTags(utilisateur.id), chargerNotesTags()]);
  }

  async function ajouterTagANote(noteId, tagId) {
    setErreur(null);
    const { error } = await supabase.from("notes_tags").insert({ note_id: noteId, tag_id: tagId });

    if (error) {
      if (error.code === "23505") return;
      setErreur("Erreur : " + error.message);
      return;
    }

    setDropdownTagNoteId(null);
    await chargerNotesTags();
  }

  async function retirerTagDeNote(noteId, tagId) {
    setErreur(null);
    const { error } = await supabase
      .from("notes_tags")
      .delete()
      .eq("note_id", noteId)
      .eq("tag_id", tagId);

    if (error) {
      setErreur("Erreur : " + error.message);
      return;
    }

    await chargerNotesTags();
  }

  function getTag(tagId) {
    return tags.find((t) => t.id === tagId);
  }

  // === RÉSUMÉ IA ===

  async function resumerNote(note) {
    setResumes((prev) => ({ ...prev, [note.id]: { texte: null, chargement: true, erreur: null } }));

    try {
      const res = await fetch("/api/resumer", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ titre: note.titre, contenu: note.contenu }),
      });

      const data = await res.json();

      if (!res.ok) {
        setResumes((prev) => ({ ...prev, [note.id]: { texte: null, chargement: false, erreur: data.error || "Erreur inconnue" } }));
        return;
      }

      setResumes((prev) => ({ ...prev, [note.id]: { texte: data.resume, chargement: false, erreur: null } }));
    } catch {
      setResumes((prev) => ({ ...prev, [note.id]: { texte: null, chargement: false, erreur: "Impossible de contacter le serveur." } }));
    }
  }

  function masquerResume(noteId) {
    setResumes((prev) => {
      const copie = { ...prev };
      delete copie[noteId];
      return copie;
    });
  }

  async function copierNote(note) {
    const texte = note.contenu ? note.titre + "\n\n" + note.contenu : note.titre;
    try {
      await navigator.clipboard.writeText(texte);
      setSucces("Note copiée !");
    } catch {
      setErreur("Impossible de copier la note.");
    }
  }

  // Déconnexion
  async function handleLogout() {
    await supabase.auth.signOut();
    router.push("/login");
  }

  // === RENDU — Composant NoteDetail (panneau droit / mobile détail) ===

  function renderNoteDetail() {
    if (!noteSelectionnee) {
      return (
        <div className="flex-1 flex items-center justify-center p-8">
          <div className="text-center">
            <p className="text-4xl mb-4">&#128221;</p>
            <p className="text-sm font-bold uppercase tracking-widest" style={{ color: "var(--text-muted)" }}>
              Sélectionne une note
            </p>
            <p className="text-xs mt-1" style={{ color: "var(--text-muted)" }}>
              Clique sur une note dans la liste
            </p>
          </div>
        </div>
      );
    }

    const note = noteSelectionnee;
    const tagIds = notesTags[note.id] || [];
    const tagsDeNote = tagIds.map(getTag).filter(Boolean);
    const tagsDisponibles = tags.filter((t) => !tagIds.includes(t.id));
    const enEdition = editionId === note.id;

    return (
      <div
        className="flex flex-col h-full"
        style={{ backgroundColor: enEdition ? getCouleurFond(editionCouleur) : getCouleurFond(note.couleur) }}
      >
        {/* Header détail */}
        <div className="detail-header">
          {/* Bouton retour mobile */}
          <button
            onClick={retourListe}
            className="btn-brutal ghost md:hidden"
            style={{ fontSize: "0.7rem", padding: "0.25rem 0.5rem", flexShrink: 0 }}
          >
            &larr; Notes
          </button>

          {enEdition ? (
            <input
              type="text"
              value={editionTitre}
              onChange={(e) => setEditionTitre(e.target.value)}
              className="input-glass"
              style={{ fontWeight: 700, fontSize: "1rem", flex: 1, minWidth: 0 }}
            />
          ) : (
            <h2 className="font-black text-base" style={{ color: "var(--text-primary)", flex: 1, minWidth: 0, wordBreak: "break-word" }}>
              {note.titre}
            </h2>
          )}
        </div>

        {/* Body */}
        <div className="detail-body flex-1 overflow-y-auto">
          {enEdition ? (
            <div className="space-y-3">
              <textarea
                value={editionContenu}
                onChange={(e) => setEditionContenu(e.target.value)}
                rows={12}
                className="input-glass"
                style={{ resize: "vertical", minHeight: "200px" }}
              />
              {/* Sélecteur couleur */}
              <div>
                <p className="text-xs font-bold uppercase tracking-wider mb-1.5" style={{ color: "var(--text-muted)" }}>
                  Couleur de la note
                </p>
                <div className="flex flex-wrap gap-2">
                  {COULEURS_NOTES.map((c) => (
                    <button
                      key={c.nom}
                      type="button"
                      onClick={() => setEditionCouleur(c.hex)}
                      title={c.nom}
                      style={{
                        width: "1.75rem",
                        height: "1.75rem",
                        borderRadius: "50%",
                        background: c.hex ? (sombre ? c.hexDark : c.hex) : "transparent",
                        border: editionCouleur === c.hex
                          ? "3px solid var(--accent)"
                          : "2px solid var(--input-border)",
                        cursor: "pointer",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        fontSize: "0.7rem",
                        color: "var(--text-muted)",
                        boxShadow: editionCouleur === c.hex ? "0 0 0 2px var(--accent-glow)" : "none",
                        transition: "all 0.15s",
                      }}
                    >
                      {c.hex === null && "\u00d7"}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          ) : (
            <>
              {/* Tags cliquables */}
              {tagsDeNote.length > 0 && (
                <div className="flex flex-wrap gap-1 mb-3">
                  {tagsDeNote.map((tag) => (
                    <button
                      key={tag.id}
                      onClick={() => retirerTagDeNote(note.id, tag.id)}
                      title={"Retirer \u00ab " + tag.nom + " \u00bb"}
                      style={{
                        background: tag.couleur + "25",
                        color: tag.couleur,
                        border: "1px solid " + tag.couleur,
                        borderRadius: "2px",
                        padding: "0.1rem 0.4rem",
                        fontSize: "0.6rem",
                        fontWeight: 700,
                        cursor: "pointer",
                        textTransform: "uppercase",
                        letterSpacing: "0.04em",
                        lineHeight: 1.4,
                      }}
                    >
                      {tag.nom} &times;
                    </button>
                  ))}
                </div>
              )}

              {note.contenu ? (
                <p className="text-sm leading-relaxed" style={{ color: "var(--text-secondary)", whiteSpace: "pre-wrap" }}>
                  {note.contenu}
                </p>
              ) : (
                <p className="text-sm" style={{ color: "var(--text-muted)", fontStyle: "italic" }}>
                  Aucun contenu
                </p>
              )}

              {/* Résumé IA */}
              {resumes[note.id] && (
                <div
                  className="mt-4 p-2"
                  style={{
                    background: "var(--accent-glow)",
                    border: "1.5px solid var(--accent)",
                    borderRadius: "2px",
                  }}
                >
                  <div className="flex items-start justify-between gap-2">
                    <p className="text-xs font-bold uppercase tracking-wider" style={{ color: "var(--accent)" }}>
                      Résumé IA
                    </p>
                    {!resumes[note.id].chargement && (
                      <button
                        onClick={() => masquerResume(note.id)}
                        style={{ color: "var(--accent)", fontSize: "0.9rem", lineHeight: 1 }}
                      >
                        &times;
                      </button>
                    )}
                  </div>
                  {resumes[note.id].chargement ? (
                    <p className="text-xs mt-1 flex items-center gap-2" style={{ color: "var(--text-secondary)" }}>
                      <span
                        className="inline-block w-3 h-3 border-2 rounded-full animate-spin"
                        style={{ borderColor: "var(--accent)", borderTopColor: "transparent" }}
                      />
                      Résumé en cours...
                    </p>
                  ) : resumes[note.id].erreur ? (
                    <p className="text-xs mt-1" style={{ color: "var(--danger)" }}>
                      {resumes[note.id].erreur}
                    </p>
                  ) : (
                    <p className="text-xs mt-1 leading-relaxed" style={{ color: "var(--text-primary)" }}>
                      {resumes[note.id].texte}
                    </p>
                  )}
                </div>
              )}

              <p className="text-xs font-mono mt-4" style={{ color: "var(--text-muted)" }}>
                {new Date(note.created_at).toLocaleDateString("fr-FR", {
                  day: "numeric",
                  month: "short",
                  year: "numeric",
                  hour: "2-digit",
                  minute: "2-digit",
                })}
              </p>
            </>
          )}
        </div>

        {/* Footer actions */}
        <div className="detail-footer">
          {/* Confirmation de suppression */}
          {confirmSuppId === note.id ? (
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold uppercase" style={{ color: "var(--danger)" }}>
                Supprimer ?
              </span>
              <button
                onClick={() => supprimerNote(note.id)}
                className="btn-brutal danger"
                style={{ fontSize: "0.65rem", padding: "0.25rem 0.6rem" }}
              >
                Oui
              </button>
              <button
                onClick={() => setConfirmSuppId(null)}
                className="btn-brutal ghost"
                style={{ fontSize: "0.65rem", padding: "0.25rem 0.6rem" }}
              >
                Non
              </button>
            </div>
          ) : (
            <div className="flex flex-wrap items-center gap-2">
              {enEdition ? (
                <>
                  <button
                    onClick={() => sauvegarderEdition(note.id)}
                    className="btn-brutal primary"
                    style={{ fontSize: "0.7rem", padding: "0.35rem 0.75rem" }}
                  >
                    Sauver
                  </button>
                  <button
                    onClick={annulerEdition}
                    className="btn-brutal ghost"
                    style={{ fontSize: "0.7rem", padding: "0.35rem 0.75rem" }}
                  >
                    Annuler
                  </button>
                </>
              ) : (
                <>
                  <button
                    onClick={() => commencerEdition(note)}
                    className="btn-brutal primary"
                    style={{ fontSize: "0.7rem", padding: "0.35rem 0.75rem" }}
                  >
                    Modifier
                  </button>
                  <button
                    onClick={() => dupliquerNote(note)}
                    className="btn-brutal ghost"
                    style={{ fontSize: "0.7rem", padding: "0.35rem 0.75rem" }}
                  >
                    Dupliquer
                  </button>
                  <button
                    onClick={() => copierNote(note)}
                    className="btn-brutal ghost"
                    style={{ fontSize: "0.7rem", padding: "0.35rem 0.75rem" }}
                  >
                    Copier
                  </button>
                  <button
                    onClick={() => resumerNote(note)}
                    disabled={!note.contenu || resumes[note.id]?.chargement}
                    className="btn-brutal ghost disabled:opacity-30"
                    style={{ fontSize: "0.7rem", padding: "0.35rem 0.75rem", color: "var(--accent)" }}
                    title={note.contenu ? "Résumer avec l'IA" : "Ajoute du contenu pour résumer"}
                  >
                    Résumer
                  </button>

                  {/* Bouton + tag */}
                  <div className="relative" ref={dropdownTagNoteId === note.id ? dropdownRef : null}>
                    <button
                      onClick={() => setDropdownTagNoteId(dropdownTagNoteId === note.id ? null : note.id)}
                      className="btn-brutal ghost"
                      style={{ fontSize: "0.7rem", padding: "0.35rem 0.5rem", color: "var(--accent)" }}
                      title="Ajouter un tag"
                    >
                      + Tag
                    </button>
                    {dropdownTagNoteId === note.id && (
                      <div
                        className="absolute left-0 bottom-full mb-1"
                        style={{
                          background: "var(--glass-bg)",
                          backdropFilter: "blur(16px)",
                          WebkitBackdropFilter: "blur(16px)",
                          border: "2px solid var(--glass-border)",
                          borderRadius: "2px",
                          boxShadow: "4px 4px 0 var(--brutal-shadow)",
                          padding: "0.4rem",
                          minWidth: "120px",
                          zIndex: 50,
                        }}
                      >
                        {tagsDisponibles.length === 0 ? (
                          <p className="text-xs px-1" style={{ color: "var(--text-muted)" }}>
                            {tags.length === 0 ? "Crée un tag d'abord" : "Tous assignés"}
                          </p>
                        ) : (
                          tagsDisponibles.map((tag) => (
                            <button
                              key={tag.id}
                              onClick={() => ajouterTagANote(note.id, tag.id)}
                              className="flex items-center gap-1.5 w-full text-left px-2 py-1 text-xs font-bold"
                              style={{ color: tag.couleur, borderRadius: "1px", cursor: "pointer" }}
                              onMouseEnter={(e) => e.currentTarget.style.background = tag.couleur + "15"}
                              onMouseLeave={(e) => e.currentTarget.style.background = "transparent"}
                            >
                              <span
                                style={{ width: "0.5rem", height: "0.5rem", background: tag.couleur, borderRadius: "1px", display: "inline-block", flexShrink: 0 }}
                              />
                              {tag.nom}
                            </button>
                          ))
                        )}
                      </div>
                    )}
                  </div>

                  <button
                    onClick={() => { setConfirmSuppId(note.id); setEditionId(null); }}
                    className="btn-brutal ghost ml-auto"
                    style={{ fontSize: "0.7rem", padding: "0.35rem 0.75rem", color: "var(--danger)" }}
                  >
                    Supprimer
                  </button>
                </>
              )}
            </div>
          )}
        </div>
      </div>
    );
  }

  // État de chargement
  if (chargement) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ zIndex: 1, position: "relative" }}>
        <div className="text-center">
          <div
            className="inline-block w-8 h-8 border-4 rounded-full animate-spin mb-4"
            style={{ borderColor: "var(--accent)", borderTopColor: "transparent" }}
          />
          <p className="text-sm font-bold uppercase tracking-widest" style={{ color: "var(--text-muted)" }}>
            Chargement
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="h-screen flex flex-col relative" style={{ zIndex: 1 }}>
      {/* Formes décoratives en arrière-plan */}
      <div
        className="fixed top-[-20%] right-[-10%] w-[600px] h-[600px] rounded-full opacity-20 blur-3xl pointer-events-none"
        style={{ background: "var(--accent)", zIndex: -1 }}
      />
      <div
        className="fixed bottom-[-15%] left-[-5%] w-[400px] h-[400px] rounded-full opacity-15 blur-3xl pointer-events-none"
        style={{ background: "var(--danger)", zIndex: -1 }}
      />

      {/* === HEADER === */}
      <header className="glass-card p-4 flex items-center justify-between flex-wrap gap-3 m-3 mb-0" style={{ flexShrink: 0 }}>
        <div className="flex items-center gap-4">
          <h1 className="text-xl font-black tracking-tight">
            WEB<span style={{ color: "var(--accent)" }}>JOURNEY</span>
          </h1>
          <div className="tag" style={{ color: "var(--accent)", borderColor: "var(--accent)" }}>
            {notes.length} note{notes.length !== 1 ? "s" : ""}
          </div>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={() => setPanneauTagsOuvert(!panneauTagsOuvert)}
            className="btn-brutal ghost"
            style={{ fontSize: "0.7rem", padding: "0.35rem 0.75rem" }}
          >
            {panneauTagsOuvert ? "Fermer tags" : "Gérer tags"}
          </button>
          <span className="text-xs font-mono hidden sm:block" style={{ color: "var(--text-muted)" }}>
            {utilisateur.email}
          </span>
          <button onClick={toggleTheme} className="btn-brutal ghost" style={{ fontSize: "1rem", padding: "0.35rem 0.55rem" }}>
            {sombre ? "\u2600" : "\u263E"}
          </button>
          <button onClick={handleLogout} className="btn-brutal danger" style={{ fontSize: "0.7rem", padding: "0.35rem 0.75rem" }}>
            Quitter
          </button>
        </div>
      </header>

      {/* === PANNEAU DE GESTION DES TAGS === */}
      {panneauTagsOuvert && (
        <div className="glass-card p-5 space-y-4 mx-3 mt-3" style={{ flexShrink: 0 }}>
          <p className="text-xs font-bold uppercase tracking-widest" style={{ color: "var(--text-muted)" }}>
            Gestion des tags
          </p>

          <form onSubmit={creerTag} className="flex flex-wrap items-end gap-3">
            <div className="flex-1 min-w-[150px]">
              <input
                type="text"
                value={nouveauTagNom}
                onChange={(e) => setNouveauTagNom(e.target.value)}
                placeholder="Nom du tag"
                required
                className="input-glass"
              />
            </div>
            <div className="flex gap-1.5">
              {COULEURS_TAGS.map((c) => (
                <button
                  key={c.hex}
                  type="button"
                  onClick={() => setNouveauTagCouleur(c.hex)}
                  title={c.nom}
                  style={{
                    width: "1.5rem",
                    height: "1.5rem",
                    background: c.hex,
                    border: nouveauTagCouleur === c.hex ? "3px solid var(--text-primary)" : "2px solid transparent",
                    borderRadius: "2px",
                    cursor: "pointer",
                  }}
                />
              ))}
            </div>
            <button type="submit" className="btn-brutal primary" style={{ fontSize: "0.7rem", padding: "0.35rem 0.75rem" }}>
              + Créer
            </button>
          </form>

          {tags.length === 0 ? (
            <p className="text-xs" style={{ color: "var(--text-muted)" }}>Aucun tag créé.</p>
          ) : (
            <div className="flex flex-wrap gap-2">
              {tags.map((tag) => (
                <div
                  key={tag.id}
                  className="flex items-center gap-1.5"
                  style={{
                    background: tag.couleur + "20",
                    border: "1.5px solid " + tag.couleur,
                    borderRadius: "2px",
                    padding: "0.25rem 0.5rem",
                  }}
                >
                  <span
                    style={{ width: "0.5rem", height: "0.5rem", background: tag.couleur, borderRadius: "1px", display: "inline-block" }}
                  />
                  <span className="text-xs font-bold" style={{ color: tag.couleur }}>
                    {tag.nom}
                  </span>
                  {confirmSuppTagId === tag.id ? (
                    <>
                      <button
                        onClick={() => supprimerTag(tag.id)}
                        className="text-xs font-bold ml-1"
                        style={{ color: "var(--danger)" }}
                      >
                        Oui
                      </button>
                      <button
                        onClick={() => setConfirmSuppTagId(null)}
                        className="text-xs"
                        style={{ color: "var(--text-muted)" }}
                      >
                        Non
                      </button>
                    </>
                  ) : (
                    <button
                      onClick={() => setConfirmSuppTagId(tag.id)}
                      className="text-xs ml-1"
                      style={{ color: "var(--text-muted)", lineHeight: 1 }}
                      title="Supprimer ce tag"
                    >
                      &times;
                    </button>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* === FORMULAIRE D'AJOUT === */}
      <form onSubmit={ajouterNote} className="glass-card p-4 space-y-2 mx-3 mt-3" style={{ flexShrink: 0 }}>
        <p className="text-xs font-bold uppercase tracking-widest" style={{ color: "var(--text-muted)" }}>
          Nouvelle note
        </p>
        <div className="flex flex-wrap gap-2">
          <input
            type="text"
            value={titre}
            onChange={(e) => setTitre(e.target.value)}
            placeholder="Titre"
            required
            className="input-glass"
            style={{ fontWeight: 700, flex: "1 1 200px" }}
          />
          <textarea
            value={contenu}
            onChange={(e) => setContenu(e.target.value)}
            placeholder="Contenu (optionnel)"
            rows={1}
            className="input-glass"
            style={{ resize: "none", flex: "2 1 300px" }}
          />
          <button type="submit" className="btn-brutal primary" style={{ fontSize: "0.7rem", padding: "0.35rem 0.75rem" }}>
            + Ajouter
          </button>
        </div>
        {/* Couleurs de note */}
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-xs font-bold uppercase tracking-wider" style={{ color: "var(--text-muted)" }}>
            Couleur :
          </span>
          {COULEURS_NOTES.map((c) => (
            <button
              key={c.nom}
              type="button"
              onClick={() => setCouleurNote(c.hex)}
              title={c.nom}
              style={{
                width: "1.25rem",
                height: "1.25rem",
                borderRadius: "50%",
                background: c.hex ? (sombre ? c.hexDark : c.hex) : "transparent",
                border: couleurNote === c.hex
                  ? "2.5px solid var(--accent)"
                  : "1.5px solid var(--input-border)",
                cursor: "pointer",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                fontSize: "0.55rem",
                color: "var(--text-muted)",
                transition: "all 0.15s",
              }}
            >
              {c.hex === null && "\u00d7"}
            </button>
          ))}
        </div>
      </form>

      {/* Messages de feedback */}
      <div className="mx-3 mt-2" style={{ flexShrink: 0 }}>
        {succes && (
          <div
            className="glass-card p-3 text-sm font-bold mb-2"
            style={{ color: "var(--success)", borderColor: "var(--success)" }}
          >
            {succes}
          </div>
        )}
        {erreur && (
          <div
            className="glass-card p-3 text-sm font-bold mb-2"
            style={{ color: "var(--danger)", borderColor: "var(--danger)" }}
          >
            {erreur}
          </div>
        )}
      </div>

      {/* === SPLIT PANEL === */}
      <div className="split-container mx-3 mt-2 mb-3" style={{ borderRadius: "4px", overflow: "hidden", border: "2px solid var(--glass-border)" }}>

        {/* === PANNEAU GAUCHE — Liste === */}
        <div className={"panel-left" + (mobileDetail ? " hidden-mobile" : "")}>
          {/* Recherche */}
          <div className="p-3 space-y-2" style={{ borderBottom: "1px solid var(--panel-border)", flexShrink: 0 }}>
            <div className="relative">
              <input
                type="text"
                value={recherche}
                onChange={(e) => setRecherche(e.target.value)}
                placeholder="Rechercher..."
                className="input-glass"
                style={{ paddingRight: "2.5rem", fontSize: "0.8rem", padding: "0.5rem 0.7rem" }}
              />
              {recherche && (
                <button
                  onClick={() => setRecherche("")}
                  className="absolute right-2 top-1/2 -translate-y-1/2"
                  style={{ color: "var(--text-muted)", fontSize: "1rem", lineHeight: 1, padding: "0.15rem" }}
                >
                  &times;
                </button>
              )}
            </div>

            {/* Filtres tags */}
            {tags.length > 0 && (
              <div className="flex flex-wrap gap-1">
                {tags.map((tag) => (
                  <button
                    key={tag.id}
                    onClick={() => setFiltreTagId(filtreTagId === tag.id ? null : tag.id)}
                    style={{
                      background: filtreTagId === tag.id ? tag.couleur : tag.couleur + "20",
                      color: filtreTagId === tag.id ? "#fff" : tag.couleur,
                      border: "1px solid " + tag.couleur,
                      borderRadius: "2px",
                      padding: "0.1rem 0.35rem",
                      fontSize: "0.6rem",
                      fontWeight: 700,
                      cursor: "pointer",
                      textTransform: "uppercase",
                      letterSpacing: "0.04em",
                      transition: "all 0.15s",
                    }}
                  >
                    {tag.nom}
                  </button>
                ))}
              </div>
            )}

            {/* Tri + compteur */}
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold uppercase tracking-wider" style={{ color: "var(--text-muted)" }}>
                {notesFiltrees.length} note{notesFiltrees.length !== 1 ? "s" : ""}
              </span>
              <button
                onClick={() => setTriAscendant(!triAscendant)}
                className="text-xs font-bold uppercase"
                style={{ color: "var(--accent)", cursor: "pointer", background: "none", border: "none", padding: "0.15rem 0.3rem" }}
                title={triAscendant ? "Plus récentes en premier" : "Plus anciennes en premier"}
              >
                {triAscendant ? "\u2191 Ancien" : "\u2193 Récent"}
              </button>
            </div>
          </div>

          {/* Liste des notes */}
          <div className="panel-left-scroll">
            {notes.length === 0 ? (
              <div className="p-6 text-center">
                <p className="text-2xl mb-2">&#9997;</p>
                <p className="text-xs font-bold uppercase tracking-widest" style={{ color: "var(--text-muted)" }}>
                  Aucune note
                </p>
              </div>
            ) : notesFiltrees.length === 0 ? (
              <div className="p-6 text-center">
                <p className="text-2xl mb-2">&#128269;</p>
                <p className="text-xs font-bold uppercase tracking-widest" style={{ color: "var(--text-muted)" }}>
                  Aucun résultat
                </p>
              </div>
            ) : (
              notesFiltrees.map((note) => {
                const tagIds = notesTags[note.id] || [];
                const tagsDeNote = tagIds.map(getTag).filter(Boolean);
                const tagsVisibles = tagsDeNote.slice(0, 2);
                const tagsRestants = tagsDeNote.length - 2;

                return (
                  <div
                    key={note.id}
                    className={"note-item" + (selectedNoteId === note.id ? " active" : "")}
                    onClick={() => selectionnerNote(note.id)}
                  >
                    {/* Indicateur couleur */}
                    {note.couleur && (
                      <div
                        style={{
                          width: "4px",
                          flexShrink: 0,
                          background: getCouleurFond(note.couleur),
                          marginRight: "0.6rem",
                          borderRadius: "2px",
                        }}
                      />
                    )}

                    <div style={{ flex: 1, minWidth: 0 }}>
                      {/* Titre tronqué */}
                      <p
                        className="text-xs font-bold"
                        style={{
                          color: "var(--text-primary)",
                          whiteSpace: "nowrap",
                          overflow: "hidden",
                          textOverflow: "ellipsis",
                        }}
                      >
                        {note.titre}
                      </p>

                      <div className="flex items-center gap-2 mt-0.5">
                        {/* Date courte */}
                        <span className="text-xs font-mono" style={{ color: "var(--text-muted)", fontSize: "0.6rem", flexShrink: 0 }}>
                          {new Date(note.created_at).toLocaleDateString("fr-FR", { day: "numeric", month: "short" })}
                        </span>

                        {/* Tags mini */}
                        {tagsVisibles.length > 0 && (
                          <div className="flex gap-1" style={{ minWidth: 0, overflow: "hidden" }}>
                            {tagsVisibles.map((tag) => (
                              <span
                                key={tag.id}
                                style={{
                                  background: tag.couleur + "25",
                                  color: tag.couleur,
                                  border: "1px solid " + tag.couleur,
                                  borderRadius: "2px",
                                  padding: "0 0.25rem",
                                  fontSize: "0.5rem",
                                  fontWeight: 700,
                                  textTransform: "uppercase",
                                  whiteSpace: "nowrap",
                                }}
                              >
                                {tag.nom}
                              </span>
                            ))}
                            {tagsRestants > 0 && (
                              <span className="text-xs" style={{ color: "var(--text-muted)", fontSize: "0.5rem" }}>
                                +{tagsRestants}
                              </span>
                            )}
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* === PANNEAU DROIT — Détail === */}
        <div className={"panel-right" + (!mobileDetail ? " hidden-mobile" : "")}>
          {renderNoteDetail()}
        </div>
      </div>
    </div>
  );
}
