export default function manifest() {
  return {
    id: "/",
    name: "Capsule — Mes Notes",
    short_name: "Capsule",
    description: "Notes personnelles, Markdown, images, tags et vues Kanban.",
    lang: "fr",
    start_url: "/",
    scope: "/",
    display: "standalone",
    orientation: "any",
    background_color: "#f0eee6",
    theme_color: "#5b2eff",
    categories: ["productivity", "utilities"],
    icons: [
      {
        src: "/icons/icon-192.png",
        sizes: "192x192",
        type: "image/png",
        purpose: "any",
      },
      {
        src: "/icons/icon-512.png",
        sizes: "512x512",
        type: "image/png",
        purpose: "any",
      },
      {
        src: "/icons/icon-maskable-512.png",
        sizes: "512x512",
        type: "image/png",
        purpose: "maskable",
      },
    ],
    shortcuts: [
      {
        name: "Nouvelle note",
        short_name: "Nouvelle",
        description: "Créer immédiatement une note Capsule",
        url: "/?action=new",
        icons: [{ src: "/icons/icon-192.png", sizes: "192x192", type: "image/png" }],
      },
      {
        name: "Rechercher",
        short_name: "Recherche",
        description: "Rechercher dans les notes",
        url: "/?action=search",
        icons: [{ src: "/icons/icon-192.png", sizes: "192x192", type: "image/png" }],
      },
    ],
  };
}
