"use client";

// Page principale — Notes avec design brutalism + glassmorphism
import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";

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

  // Normaliser une chaîne : minuscule + sans accents (pour la recherche)
  function normaliser(str) {
    return (str || "").normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();
  }

  // Filtrer les notes selon le terme de recherche (titre + contenu)
  const notesFiltrees = recherche.trim()
    ? notes.filter((note) => {
        const terme = normaliser(recherche);
        return normaliser(note.titre).includes(terme) || normaliser(note.contenu).includes(terme);
      })
    : notes;

  // Vérifier la session et charger les notes au montage
  useEffect(() => {
    setSombre(document.documentElement.classList.contains("dark"));

    async function init() {
      const { data: { user } } = await supabase.auth.getUser();

      if (!user) {
        router.push("/login");
        return;
      }

      setUtilisateur(user);
      await chargerNotes(user.id);
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

  // Basculer le thème sombre/clair
  function toggleTheme() {
    const isDark = !sombre;
    setSombre(isDark);
    document.documentElement.classList.toggle("dark", isDark);
    localStorage.setItem("theme", isDark ? "dark" : "light");
  }

  // Charger les notes depuis Supabase
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

  // Ajouter une nouvelle note
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

  // Supprimer une note (après confirmation)
  async function supprimerNote(noteId) {
    setErreur(null);

    const { error } = await supabase
      .from("notes")
      .delete()
      .eq("id", noteId);

    if (error) {
      setErreur("Erreur lors de la suppression : " + error.message);
      return;
    }

    setConfirmSuppId(null);
    setSucces("Note supprimée.");
    await chargerNotes(utilisateur.id);
  }

  // Dupliquer une note
  async function dupliquerNote(note) {
    setErreur(null);

    const { error } = await supabase.from("notes").insert({
      titre: "Copie de — " + note.titre,
      contenu: note.contenu,
      user_id: utilisateur.id,
    });

    if (error) {
      setErreur("Erreur lors de la duplication : " + error.message);
      return;
    }

    setSucces("Note dupliquée !");
    await chargerNotes(utilisateur.id);
  }

  // Activer le mode édition
  function commencerEdition(note) {
    setEditionId(note.id);
    setEditionTitre(note.titre);
    setEditionContenu(note.contenu || "");
    setConfirmSuppId(null);
  }

  // Annuler l'édition
  function annulerEdition() {
    setEditionId(null);
    setEditionTitre("");
    setEditionContenu("");
  }

  // Sauvegarder les modifications
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
      <header className="glass-card p-4 mb-6 flex items-center justify-between">
        <div className="flex items-center gap-4">
          <h1 className="text-xl font-black tracking-tight">
            WEB<span style={{ color: "var(--accent)" }}>JOURNEY</span>
          </h1>
          <div className="tag" style={{ color: "var(--accent)", borderColor: "var(--accent)" }}>
            {notes.length} note{notes.length !== 1 ? "s" : ""}
          </div>
        </div>
        <div className="flex items-center gap-3">
          <span
            className="text-xs font-mono hidden sm:block"
            style={{ color: "var(--text-muted)" }}
          >
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

      {/* === BARRE DE RECHERCHE === */}
      {notes.length > 0 && (
        <div className="mb-6">
          <div className="relative">
            <input
              type="text"
              value={recherche}
              onChange={(e) => setRecherche(e.target.value)}
              placeholder="Rechercher une note..."
              className="input-glass"
              style={{ paddingRight: "2.5rem" }}
            />
            {/* Bouton X pour vider la recherche */}
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
          {/* Compteur de résultats */}
          {recherche.trim() && (
            <p className="text-xs font-bold uppercase tracking-wider mt-2" style={{ color: "var(--text-muted)" }}>
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
        /* Aucun résultat de recherche */
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
          {notesFiltrees.map((note) => (
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
                      className="flex gap-2 pt-3"
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
          ))}
        </div>
      )}
    </div>
  );
}
