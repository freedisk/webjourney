"use client";

// Page principale — Liste des notes de l'utilisateur
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

  // Vérifier la session et charger les notes au montage
  useEffect(() => {
    async function init() {
      // Récupérer l'utilisateur connecté
      const { data: { user } } = await supabase.auth.getUser();

      if (!user) {
        // Pas connecté → redirection vers /login
        router.push("/login");
        return;
      }

      setUtilisateur(user);
      await chargerNotes(user.id);
      setChargement(false);
    }

    init();
  }, [router]);

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

    // Réinitialiser le formulaire et recharger les notes
    setTitre("");
    setContenu("");
    await chargerNotes(utilisateur.id);
  }

  // Supprimer une note
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
      <div className="min-h-screen flex items-center justify-center">
        <p className="text-gray-500">Chargement...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen max-w-2xl mx-auto px-4 py-8">
      {/* En-tête avec email et déconnexion */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold">Mes Notes</h1>
          <p className="text-sm text-gray-500">{utilisateur.email}</p>
        </div>
        <button
          onClick={handleLogout}
          className="text-sm text-red-600 hover:text-red-800"
        >
          Se déconnecter
        </button>
      </div>

      {/* Formulaire d'ajout de note */}
      <form onSubmit={ajouterNote} className="bg-white rounded-lg shadow p-4 mb-6 space-y-3">
        <input
          type="text"
          value={titre}
          onChange={(e) => setTitre(e.target.value)}
          placeholder="Titre de la note"
          required
          className="w-full border rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
        <textarea
          value={contenu}
          onChange={(e) => setContenu(e.target.value)}
          placeholder="Contenu (optionnel)"
          rows={3}
          className="w-full border rounded-md px-3 py-2 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
        <button
          type="submit"
          className="bg-blue-600 text-white rounded-md px-4 py-2 text-sm font-medium hover:bg-blue-700"
        >
          Ajouter
        </button>
      </form>

      {/* Message d'erreur */}
      {erreur && (
        <p className="text-red-600 text-sm mb-4">{erreur}</p>
      )}

      {/* Liste des notes */}
      {notes.length === 0 ? (
        <p className="text-center text-gray-400 py-12">
          Aucune note pour l&apos;instant. Crée ta première note !
        </p>
      ) : (
        <div className="space-y-3">
          {notes.map((note) => (
            <div key={note.id} className="bg-white rounded-lg shadow p-4 flex items-start justify-between gap-4">
              <div className="min-w-0">
                <h2 className="font-semibold text-sm">{note.titre}</h2>
                {note.contenu && (
                  <p className="text-sm text-gray-600 mt-1 whitespace-pre-wrap">{note.contenu}</p>
                )}
                <p className="text-xs text-gray-400 mt-2">
                  {new Date(note.created_at).toLocaleDateString("fr-FR", {
                    day: "numeric",
                    month: "long",
                    year: "numeric",
                    hour: "2-digit",
                    minute: "2-digit",
                  })}
                </p>
              </div>
              <button
                onClick={() => supprimerNote(note.id)}
                className="text-red-400 hover:text-red-600 text-sm shrink-0"
                title="Supprimer"
              >
                Supprimer
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
