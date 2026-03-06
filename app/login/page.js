"use client";

// Page de connexion / inscription — design brutalism + glassmorphism
import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [chargement, setChargement] = useState(false);
  const [erreur, setErreur] = useState(null);
  const [message, setMessage] = useState(null);
  const [sombre, setSombre] = useState(false);

  // Lire le thème au montage
  useEffect(() => {
    setSombre(document.documentElement.classList.contains("dark"));
  }, []);

  // Basculer le thème sombre/clair
  function toggleTheme() {
    const isDark = !sombre;
    setSombre(isDark);
    document.documentElement.classList.toggle("dark", isDark);
    localStorage.setItem("theme", isDark ? "dark" : "light");
  }

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

    setMessage("Compte créé ! Vérifie ton email pour confirmer.");
    setChargement(false);
  }

  return (
    <div className="min-h-screen flex items-center justify-center px-4 relative" style={{ zIndex: 1 }}>
      {/* Bouton thème en haut à droite */}
      <button
        onClick={toggleTheme}
        className="btn-brutal ghost fixed top-4 right-4"
        style={{ fontSize: "1.2rem", padding: "0.5rem 0.7rem" }}
      >
        {sombre ? "\u2600" : "\u263E"}
      </button>

      {/* Forme décorative en arrière-plan */}
      <div
        className="fixed top-[-20%] right-[-10%] w-[500px] h-[500px] rounded-full opacity-30 blur-3xl pointer-events-none"
        style={{ background: "var(--accent)", zIndex: -1 }}
      />
      <div
        className="fixed bottom-[-15%] left-[-10%] w-[400px] h-[400px] rounded-full opacity-20 blur-3xl pointer-events-none"
        style={{ background: "var(--danger)", zIndex: -1 }}
      />

      <div className="w-full max-w-sm">
        {/* Titre brutaliste */}
        <div className="mb-8 text-center">
          <h1
            className="text-4xl font-black tracking-tight"
            style={{ color: "var(--text-primary)" }}
          >
            WEB<span style={{ color: "var(--accent)" }}>JOURNEY</span>
          </h1>
          <p className="text-xs font-bold uppercase tracking-widest mt-2" style={{ color: "var(--text-muted)" }}>
            Connexion
          </p>
        </div>

        {/* Formulaire glass + brutal */}
        <form onSubmit={handleLogin} className="glass-card p-6 space-y-4">
          <div>
            <label
              htmlFor="email"
              className="block text-xs font-bold uppercase tracking-wider mb-1.5"
              style={{ color: "var(--text-secondary)" }}
            >
              Email
            </label>
            <input
              id="email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              placeholder="ton@email.com"
              className="input-glass"
            />
          </div>

          <div>
            <label
              htmlFor="password"
              className="block text-xs font-bold uppercase tracking-wider mb-1.5"
              style={{ color: "var(--text-secondary)" }}
            >
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
              className="input-glass"
            />
          </div>

          {/* Messages d'erreur ou de succès */}
          {erreur && (
            <div className="tag" style={{ color: "var(--danger)", borderColor: "var(--danger)", display: "block", padding: "0.5rem", fontSize: "0.75rem" }}>
              {erreur}
            </div>
          )}
          {message && (
            <div className="tag" style={{ color: "var(--success)", borderColor: "var(--success)", display: "block", padding: "0.5rem", fontSize: "0.75rem" }}>
              {message}
            </div>
          )}

          {/* Boutons */}
          <div className="flex gap-3 pt-2">
            <button
              type="submit"
              disabled={chargement}
              className="btn-brutal primary flex-1 disabled:opacity-50"
            >
              {chargement ? "..." : "Connexion"}
            </button>
            <button
              type="button"
              onClick={handleSignUp}
              disabled={chargement}
              className="btn-brutal ghost flex-1 disabled:opacity-50"
            >
              Inscription
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
