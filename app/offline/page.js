/* eslint-disable @next/next/no-img-element */

import Link from "next/link";

export const metadata = {
  title: "Connexion requise — Capsule",
};

export default function OfflinePage() {
  return (
    <main
      style={{
        minHeight: "100dvh",
        display: "grid",
        placeItems: "center",
        padding: "1.5rem",
        background: "#0e0e12",
        color: "#f6f4ff",
        fontFamily: "system-ui, sans-serif",
      }}
    >
      <section
        style={{
          width: "min(100%, 30rem)",
          padding: "2rem",
          border: "2px solid #8b6fff",
          borderRadius: "0.75rem",
          boxShadow: "8px 8px 0 #5b2eff",
          background: "#16161d",
          textAlign: "center",
        }}
      >
        <img
          src="/icons/icon-192.png"
          alt=""
          width="96"
          height="96"
          style={{ borderRadius: "1.5rem", margin: "0 auto 1.25rem" }}
        />
        <h1 style={{ margin: 0, fontSize: "1.75rem" }}>Capsule est hors ligne</h1>
        <p style={{ margin: "1rem 0 1.5rem", color: "#b8b4c7", lineHeight: 1.6 }}>
          Une connexion est nécessaire pour synchroniser vos notes privées avec Supabase.
          Vos données ne sont pas mises en cache par le service worker.
        </p>
        <Link
          href="/"
          style={{
            display: "inline-block",
            padding: "0.75rem 1rem",
            color: "#ffffff",
            background: "#5b2eff",
            border: "2px solid #b9aaff",
            borderRadius: "0.25rem",
            fontWeight: 800,
            textDecoration: "none",
          }}
        >
          Réessayer
        </Link>
      </section>
    </main>
  );
}
