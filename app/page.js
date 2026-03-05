"use client";

// Page principale — Notes avec tags colorés, recherche, design brutalism + glassmorphism
import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";

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
  const [chargement, setChargement] = useState(true);
  const [erreur, setErreur] = useState(null);
  const [succes, setSucces] = useState(null);
  const [sombre, setSombre] = useState(false);

  // Édition inline
  const [editionId, setEditionId] = useState(null);
  const [editionTitre, setEditionTitre] = useState("");
  const [editionContenu, setEditionContenu] = useState("");

  // Confirmation de suppression
  const [confirmSuppId, setConfirmSuppId] = useState(null);

  // Recherche instantanée
  const [recherche, setRecherche] = useState("");

  // --- Tags ---
  const [tags, setTags] = useState([]);
  // Map : noteId → [tagId, tagId, ...]
  const [notesTags, setNotesTags] = useState({});
  // Panneau de gestion des tags
  const [panneauTagsOuvert, setPanneauTagsOuvert] = useState(false);
  const [nouveauTagNom, setNouveauTagNom] = useState("");
  const [nouveauTagCouleur, setNouveauTagCouleur] = useState(COULEURS_TAGS[0].hex);
  const [confirmSuppTagId, setConfirmSuppTagId] = useState(null);
  // Dropdown d'ajout de tag sur une note
  const [dropdownTagNoteId, setDropdownTagNoteId] = useState(null);
  const dropdownRef = useRef(null);
  // Filtre par tag actif
  const [filtreTagId, setFiltreTagId] = useState(null);

  // Normaliser une chaîne : minuscule + sans accents (pour la recherche)
  function normaliser(str) {
    return (str || "").normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();
  }

  // Filtrer les notes : recherche textuelle + filtre par tag
  const notesFiltrees = notes.filter((note) => {
    // Filtre textuel
    if (recherche.trim()) {
      const terme = normaliser(recherche);
      const matchTexte = normaliser(note.titre).includes(terme) || normaliser(note.contenu).includes(terme);
      if (!matchTexte) return false;
    }
    // Filtre par tag
    if (filtreTagId) {
      const tagsDeLaNote = notesTags[note.id] || [];
      if (!tagsDeLaNote.includes(filtreTagId)) return false;
    }
    return true;
  });

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

  // Charger tous les tags de l'utilisateur
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

  // Charger toutes les associations notes_tags
  async function chargerNotesTags() {
    const { data, error } = await supabase
      .from("notes_tags")
      .select("*");

    if (error) {
      setErreur("Impossible de charger les associations : " + error.message);
      return;
    }

    // Construire la map noteId → [tagId, ...]
    const map = {};
    for (const row of data) {
      if (!map[row.note_id]) map[row.note_id] = [];
      map[row.note_id].push(row.tag_id);
    }
    setNotesTags(map);
  }

  // === CRUD NOTES ===

  async function ajouterNote(e) {
    e.preventDefault();
    setErreur(null);
    if (!titre.trim()) return;

    const { error } = await supabase.from("notes").insert({
      titre: titre.trim(),
      contenu: contenu.trim(),
      user_id: utilisateur.id,
    });

    if (error) {
      setErreur("Erreur lors de l'ajout : " + error.message);
      return;
    }

    setTitre("");
    setContenu("");
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
    setSucces("Note supprimée.");
    await Promise.all([chargerNotes(utilisateur.id), chargerNotesTags()]);
  }

  async function dupliquerNote(note) {
    setErreur(null);
    const { data, error } = await supabase.from("notes").insert({
      titre: "Copie de — " + note.titre,
      contenu: note.contenu,
      user_id: utilisateur.id,
    }).select();

    if (error) {
      setErreur("Erreur lors de la duplication : " + error.message);
      return;
    }

    // Dupliquer aussi les tags de la note
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
    setConfirmSuppId(null);
  }

  function annulerEdition() {
    setEditionId(null);
    setEditionTitre("");
    setEditionContenu("");
  }

  async function sauvegarderEdition(noteId) {
    setErreur(null);
    if (!editionTitre.trim()) return;

    const { error } = await supabase
      .from("notes")
      .update({ titre: editionTitre.trim(), contenu: editionContenu.trim() })
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

  // Créer un nouveau tag
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

  // Supprimer un tag (et ses associations)
  async function supprimerTag(tagId) {
    setErreur(null);
    const { error } = await supabase.from("tags").delete().eq("id", tagId);

    if (error) {
      setErreur("Erreur lors de la suppression du tag : " + error.message);
      return;
    }

    setConfirmSuppTagId(null);
    // Désactiver le filtre si on supprime le tag filtré
    if (filtreTagId === tagId) setFiltreTagId(null);
    setSucces("Tag supprimé.");
    await Promise.all([chargerTags(utilisateur.id), chargerNotesTags()]);
  }

  // Assigner un tag à une note
  async function ajouterTagANote(noteId, tagId) {
    setErreur(null);
    const { error } = await supabase.from("notes_tags").insert({ note_id: noteId, tag_id: tagId });

    if (error) {
      // Ignorer les doublons
      if (error.code === "23505") return;
      setErreur("Erreur : " + error.message);
      return;
    }

    setDropdownTagNoteId(null);
    await chargerNotesTags();
  }

  // Retirer un tag d'une note
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

  // Trouver un tag par son ID
  function getTag(tagId) {
    return tags.find((t) => t.id === tagId);
  }

  // Déconnexion
  async function handleLogout() {
    await supabase.auth.signOut();
    router.push("/login");
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
    <div className="min-h-screen max-w-6xl mx-auto px-4 py-6 relative" style={{ zIndex: 1 }}>
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
      <header className="glass-card p-4 mb-6 flex items-center justify-between flex-wrap gap-3">
        <div className="flex items-center gap-4">
          <h1 className="text-xl font-black tracking-tight">
            WEB<span style={{ color: "var(--accent)" }}>JOURNEY</span>
          </h1>
          <div className="tag" style={{ color: "var(--accent)", borderColor: "var(--accent)" }}>
            {notes.length} note{notes.length !== 1 ? "s" : ""}
          </div>
        </div>
        <div className="flex items-center gap-3">
          {/* Bouton gérer les tags */}
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
        <div className="glass-card p-5 mb-6 space-y-4">
          <p className="text-xs font-bold uppercase tracking-widest" style={{ color: "var(--text-muted)" }}>
            Gestion des tags
          </p>

          {/* Formulaire de création de tag */}
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
            {/* Sélecteur de couleur */}
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

          {/* Liste des tags existants */}
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
                  {/* Suppression avec confirmation */}
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
      <form onSubmit={ajouterNote} className="glass-card p-5 mb-6 space-y-3">
        <p className="text-xs font-bold uppercase tracking-widest" style={{ color: "var(--text-muted)" }}>
          Nouvelle note
        </p>
        <input
          type="text"
          value={titre}
          onChange={(e) => setTitre(e.target.value)}
          placeholder="Titre"
          required
          className="input-glass"
          style={{ fontWeight: 700 }}
        />
        <textarea
          value={contenu}
          onChange={(e) => setContenu(e.target.value)}
          placeholder="Contenu (optionnel)"
          rows={3}
          className="input-glass"
          style={{ resize: "none" }}
        />
        <button type="submit" className="btn-brutal primary">
          + Ajouter
        </button>
      </form>

      {/* === BARRE DE RECHERCHE + FILTRES TAGS === */}
      {notes.length > 0 && (
        <div className="mb-6 space-y-3">
          <div className="relative">
            <input
              type="text"
              value={recherche}
              onChange={(e) => setRecherche(e.target.value)}
              placeholder="Rechercher une note..."
              className="input-glass"
              style={{ paddingRight: "2.5rem" }}
            />
            {recherche && (
              <button
                onClick={() => setRecherche("")}
                className="absolute right-2 top-1/2 -translate-y-1/2"
                style={{ color: "var(--text-muted)", fontSize: "1.1rem", lineHeight: 1, padding: "0.25rem" }}
              >
                &times;
              </button>
            )}
          </div>

          {/* Filtres par tag */}
          {tags.length > 0 && (
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-xs font-bold uppercase tracking-wider" style={{ color: "var(--text-muted)" }}>
                Filtrer :
              </span>
              {tags.map((tag) => (
                <button
                  key={tag.id}
                  onClick={() => setFiltreTagId(filtreTagId === tag.id ? null : tag.id)}
                  style={{
                    background: filtreTagId === tag.id ? tag.couleur : tag.couleur + "20",
                    color: filtreTagId === tag.id ? "#fff" : tag.couleur,
                    border: "1.5px solid " + tag.couleur,
                    borderRadius: "2px",
                    padding: "0.2rem 0.55rem",
                    fontSize: "0.7rem",
                    fontWeight: 700,
                    cursor: "pointer",
                    textTransform: "uppercase",
                    letterSpacing: "0.04em",
                    transition: "all 0.15s",
                    boxShadow: filtreTagId === tag.id ? "2px 2px 0 " + tag.couleur + "60" : "none",
                  }}
                >
                  {tag.nom}
                </button>
              ))}
            </div>
          )}

          {/* Compteur de résultats */}
          {(recherche.trim() || filtreTagId) && (
            <p className="text-xs font-bold uppercase tracking-wider" style={{ color: "var(--text-muted)" }}>
              {notesFiltrees.length} note{notesFiltrees.length !== 1 ? "s" : ""} trouvée{notesFiltrees.length !== 1 ? "s" : ""}
            </p>
          )}
        </div>
      )}

      {/* Messages de feedback */}
      {succes && (
        <div
          className="glass-card p-3 mb-4 text-sm font-bold"
          style={{ color: "var(--success)", borderColor: "var(--success)" }}
        >
          {succes}
        </div>
      )}
      {erreur && (
        <div
          className="glass-card p-3 mb-4 text-sm font-bold"
          style={{ color: "var(--danger)", borderColor: "var(--danger)" }}
        >
          {erreur}
        </div>
      )}

      {/* === GRILLE DE NOTES === */}
      {notes.length === 0 ? (
        <div className="glass-card p-16 text-center">
          <p className="text-4xl mb-4">&#9997;</p>
          <p className="text-sm font-bold uppercase tracking-widest" style={{ color: "var(--text-muted)" }}>
            Aucune note
          </p>
          <p className="text-xs mt-1" style={{ color: "var(--text-muted)" }}>
            Crée ta première note ci-dessus
          </p>
        </div>
      ) : notesFiltrees.length === 0 ? (
        <div className="glass-card p-16 text-center">
          <p className="text-4xl mb-4">&#128269;</p>
          <p className="text-sm font-bold uppercase tracking-widest" style={{ color: "var(--text-muted)" }}>
            Aucune note ne correspond
          </p>
          <p className="text-xs mt-1" style={{ color: "var(--text-muted)" }}>
            Essaie avec d&apos;autres mots-clés
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {notesFiltrees.map((note) => {
            // Tags assignés à cette note
            const tagIds = notesTags[note.id] || [];
            const tagsDeNote = tagIds.map(getTag).filter(Boolean);
            // Tags pas encore assignés (pour le dropdown)
            const tagsDisponibles = tags.filter((t) => !tagIds.includes(t.id));

            return (
              <div key={note.id} className="glass-card p-5 flex flex-col justify-between">
                {/* Mode édition inline */}
                {editionId === note.id ? (
                  <div className="space-y-3">
                    <input
                      type="text"
                      value={editionTitre}
                      onChange={(e) => setEditionTitre(e.target.value)}
                      className="input-glass"
                      style={{ fontWeight: 700 }}
                    />
                    <textarea
                      value={editionContenu}
                      onChange={(e) => setEditionContenu(e.target.value)}
                      rows={3}
                      className="input-glass"
                      style={{ resize: "none" }}
                    />
                    <div className="flex gap-2">
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
                    </div>
                  </div>
                ) : (
                  <>
                    {/* Contenu de la card */}
                    <div className="mb-4">
                      <h2 className="font-black text-sm mb-2" style={{ color: "var(--text-primary)" }}>
                        {note.titre}
                      </h2>

                      {/* Badges de tags assignés */}
                      {tagsDeNote.length > 0 && (
                        <div className="flex flex-wrap gap-1 mb-2">
                          {tagsDeNote.map((tag) => (
                            <button
                              key={tag.id}
                              onClick={() => retirerTagDeNote(note.id, tag.id)}
                              title={"Retirer « " + tag.nom + " »"}
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

                      {note.contenu && (
                        <p
                          className="text-sm leading-relaxed"
                          style={{
                            color: "var(--text-secondary)",
                            display: "-webkit-box",
                            WebkitLineClamp: 4,
                            WebkitBoxOrient: "vertical",
                            overflow: "hidden",
                            whiteSpace: "pre-wrap",
                          }}
                        >
                          {note.contenu}
                        </p>
                      )}
                      <p className="text-xs font-mono mt-3" style={{ color: "var(--text-muted)" }}>
                        {new Date(note.created_at).toLocaleDateString("fr-FR", {
                          day: "numeric",
                          month: "short",
                          year: "numeric",
                          hour: "2-digit",
                          minute: "2-digit",
                        })}
                      </p>
                    </div>

                    {/* Confirmation de suppression */}
                    {confirmSuppId === note.id ? (
                      <div
                        className="flex items-center gap-2 pt-3"
                        style={{ borderTop: "2px solid var(--danger)" }}
                      >
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
                      /* Boutons d'actions */
                      <div
                        className="flex items-center gap-2 pt-3"
                        style={{ borderTop: "1.5px solid var(--glass-border)" }}
                      >
                        <button
                          onClick={() => commencerEdition(note)}
                          className="btn-brutal ghost"
                          style={{ fontSize: "0.65rem", padding: "0.25rem 0.6rem" }}
                        >
                          Modifier
                        </button>
                        <button
                          onClick={() => dupliquerNote(note)}
                          className="btn-brutal ghost"
                          style={{ fontSize: "0.65rem", padding: "0.25rem 0.6rem" }}
                        >
                          Dupliquer
                        </button>

                        {/* Bouton + pour ajouter un tag */}
                        <div className="relative" ref={dropdownTagNoteId === note.id ? dropdownRef : null}>
                          <button
                            onClick={() => setDropdownTagNoteId(dropdownTagNoteId === note.id ? null : note.id)}
                            className="btn-brutal ghost"
                            style={{ fontSize: "0.75rem", padding: "0.25rem 0.5rem", color: "var(--accent)" }}
                            title="Ajouter un tag"
                          >
                            +
                          </button>
                          {/* Dropdown de sélection de tag */}
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
                                    style={{
                                      color: tag.couleur,
                                      borderRadius: "1px",
                                      cursor: "pointer",
                                    }}
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
                          style={{ fontSize: "0.65rem", padding: "0.25rem 0.6rem", color: "var(--danger)" }}
                        >
                          Supprimer
                        </button>
                      </div>
                    )}
                  </>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
