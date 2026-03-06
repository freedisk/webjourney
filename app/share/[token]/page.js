// Page publique de partage de note — Server Component (pas de "use client")
import { createClient } from "@supabase/supabase-js";
import MarkdownRenderer from "@/components/MarkdownRenderer";

// Client Supabase sans session auth (lecture publique via RLS policy)
function getPublicSupabase() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  );
}

export async function generateMetadata({ params }) {
  const { token } = await params;
  const supabase = getPublicSupabase();
  const { data } = await supabase
    .from("notes")
    .select("titre")
    .eq("share_token", token)
    .single();

  return {
    title: data ? data.titre + " — WebJourney" : "Note introuvable — WebJourney",
  };
}

export default async function SharedNotePage({ params }) {
  const { token } = await params;
  const supabase = getPublicSupabase();

  // Récupérer la note avec ses tags
  const { data: note, error } = await supabase
    .from("notes")
    .select("titre, contenu, created_at, couleur, notes_tags(tag_id, tags(nom, couleur))")
    .eq("share_token", token)
    .single();

  // Note introuvable ou partage désactivé
  if (error || !note) {
    return (
      <div style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", background: "var(--bg-primary)", color: "var(--text-primary)", fontFamily: "system-ui, sans-serif" }}>
        <div style={{ textAlign: "center", padding: "2rem" }}>
          <p style={{ fontSize: "3rem", marginBottom: "1rem" }}>🔒</p>
          <h1 style={{ fontSize: "1.25rem", fontWeight: 900, marginBottom: "0.5rem" }}>
            Note introuvable
          </h1>
          <p style={{ fontSize: "0.875rem", color: "var(--text-muted)" }}>
            Cette note n&apos;existe pas ou n&apos;est plus partagée.
          </p>
          <a
            href="/login"
            style={{
              display: "inline-block",
              marginTop: "1.5rem",
              padding: "0.5rem 1rem",
              fontSize: "0.75rem",
              fontWeight: 700,
              textTransform: "uppercase",
              letterSpacing: "0.05em",
              background: "var(--accent)",
              color: "#fff",
              border: "2px solid var(--accent)",
              borderRadius: "2px",
              textDecoration: "none",
            }}
          >
            Créer mon compte
          </a>
        </div>
      </div>
    );
  }

  // Extraire les tags
  const tagsList = (note.notes_tags || [])
    .map((nt) => nt.tags)
    .filter(Boolean);

  // Formater la date
  const dateFormatee = new Date(note.created_at).toLocaleDateString("fr-FR", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });

  return (
    <div style={{ minHeight: "100vh", background: "var(--bg-primary)", color: "var(--text-primary)", fontFamily: "system-ui, sans-serif" }}>
      {/* Header */}
      <header style={{
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        padding: "1rem 1.5rem",
        borderBottom: "2px solid var(--panel-border)",
      }}>
        <h1 style={{ fontSize: "1.1rem", fontWeight: 900, letterSpacing: "-0.02em" }}>
          WEB<span style={{ color: "var(--accent)" }}>JOURNEY</span>
        </h1>
        <a
          href="/login"
          style={{
            fontSize: "0.7rem",
            fontWeight: 700,
            textTransform: "uppercase",
            letterSpacing: "0.05em",
            color: "var(--accent)",
            textDecoration: "none",
          }}
        >
          Créer mon compte
        </a>
      </header>

      {/* Contenu de la note */}
      <main style={{ maxWidth: "700px", margin: "0 auto", padding: "2rem 1.5rem" }}>
        {/* Titre */}
        <h2 style={{ fontSize: "1.5rem", fontWeight: 900, marginBottom: "0.75rem", wordBreak: "break-word" }}>
          {note.titre}
        </h2>

        {/* Tags */}
        {tagsList.length > 0 && (
          <div style={{ display: "flex", flexWrap: "wrap", gap: "0.35rem", marginBottom: "1rem" }}>
            {tagsList.map((tag, i) => (
              <span
                key={i}
                style={{
                  background: tag.couleur + "25",
                  color: tag.couleur,
                  border: "1px solid " + tag.couleur,
                  borderRadius: "2px",
                  padding: "0.1rem 0.4rem",
                  fontSize: "0.6rem",
                  fontWeight: 700,
                  textTransform: "uppercase",
                  letterSpacing: "0.04em",
                }}
              >
                {tag.nom}
              </span>
            ))}
          </div>
        )}

        {/* Date */}
        <p style={{ fontSize: "0.75rem", color: "var(--text-muted)", marginBottom: "1.5rem", fontFamily: "monospace" }}>
          Partagée le {dateFormatee}
        </p>

        {/* Contenu Markdown */}
        {note.contenu ? (
          <div style={{ fontSize: "0.9375rem", lineHeight: 1.7 }}>
            <MarkdownRenderer content={note.contenu} />
          </div>
        ) : (
          <p style={{ color: "var(--text-muted)", fontStyle: "italic" }}>
            Aucun contenu
          </p>
        )}
      </main>

      {/* Footer */}
      <footer style={{
        textAlign: "center",
        padding: "2rem 1rem",
        borderTop: "1px solid var(--panel-border)",
        marginTop: "3rem",
      }}>
        <p style={{ fontSize: "0.7rem", color: "var(--text-muted)", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.08em" }}>
          Créé avec WebJourney
        </p>
      </footer>
    </div>
  );
}
