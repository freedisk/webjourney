"use client";

// Page de connexion / inscription
import { useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [chargement, setChargement] = useState(false);
  const [erreur, setErreur] = useState(null);
  const [message, setMessage] = useState(null);

  // Connexion avec email et mot de passe
  async function handleLogin(e) {
    e.preventDefault();
    setErreur(null);
    setChargement(true);

    const { error } = await supabase.auth.signInWithPassword({ email, password });

    if (error) {
      setErreur(error.message);
      setChargement(false);
      return;
    }

    // Redirection vers la page principale après connexion
    router.push("/");
  }

  // Inscription avec email et mot de passe
  async function handleSignUp(e) {
    e.preventDefault();
    setErreur(null);
    setMessage(null);
    setChargement(true);

    const { error } = await supabase.auth.signUp({ email, password });

    if (error) {
      setErreur(error.message);
      setChargement(false);
      return;
    }

    setMessage("Compte créé ! Vérifie ton email pour confirmer l'inscription.");
    setChargement(false);
  }

  return (
    <div className="min-h-screen flex items-center justify-center px-4">
      <div className="w-full max-w-sm">
        {/* Titre */}
        <h1 className="text-2xl font-bold text-center mb-8">
          WebJourney — Connexion
        </h1>

        {/* Formulaire */}
        <form onSubmit={handleLogin} className="bg-white rounded-lg shadow p-6 space-y-4">
          <div>
            <label htmlFor="email" className="block text-sm font-medium mb-1">
              Email
            </label>
            <input
              id="email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              placeholder="ton@email.com"
              className="w-full border rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <div>
            <label htmlFor="password" className="block text-sm font-medium mb-1">
              Mot de passe
            </label>
            <input
              id="password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              minLength={6}
              placeholder="6 caractères minimum"
              className="w-full border rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          {/* Messages d'erreur ou de succès */}
          {erreur && (
            <p className="text-red-600 text-sm">{erreur}</p>
          )}
          {message && (
            <p className="text-green-600 text-sm">{message}</p>
          )}

          {/* Boutons */}
          <div className="flex gap-3">
            <button
              type="submit"
              disabled={chargement}
              className="flex-1 bg-blue-600 text-white rounded-md py-2 text-sm font-medium hover:bg-blue-700 disabled:opacity-50"
            >
              {chargement ? "..." : "Se connecter"}
            </button>
            <button
              type="button"
              onClick={handleSignUp}
              disabled={chargement}
              className="flex-1 border border-blue-600 text-blue-600 rounded-md py-2 text-sm font-medium hover:bg-blue-50 disabled:opacity-50"
            >
              S&apos;inscrire
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
