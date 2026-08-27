export const SITE_URL = "https://webjourney-one.vercel.app";
export const SITE_NAME = "Capsule";
export const SITE_TITLE = "Capsule — Mes Notes";
export const SITE_DESCRIPTION = "Capturez vos idées en Markdown, organisez-les avec des tags et enrichissez-les avec des images et l'IA.";
export const SHARED_NOTE_DESCRIPTION = "Une note partagée avec Capsule, l'application de notes Markdown, images et IA.";
export const SOCIAL_IMAGE_PATH = "/opengraph-image";

export const SOCIAL_IMAGE = Object.freeze({
  url: SOCIAL_IMAGE_PATH,
  width: 1200,
  height: 630,
  alt: "Capsule — aperçu de l'application de notes",
  type: "image/png",
});

function normalizeTitle(value, fallback) {
  return String(value || fallback)
    .replace(/[\u0000-\u001f\u007f]+/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, 90) || fallback;
}

export function createSocialMetadata({
  title = SITE_TITLE,
  description = SITE_DESCRIPTION,
  url = "/",
  type = "website",
} = {}) {
  const normalizedTitle = normalizeTitle(title, SITE_TITLE);

  return {
    openGraph: {
      title: normalizedTitle,
      description,
      url,
      siteName: SITE_NAME,
      locale: "fr_FR",
      type,
      images: [SOCIAL_IMAGE],
    },
    twitter: {
      card: "summary_large_image",
      title: normalizedTitle,
      description,
      images: [SOCIAL_IMAGE_PATH],
    },
  };
}

export function createSharedNoteMetadata(noteTitle, token) {
  const found = Boolean(noteTitle);
  const title = found
    ? `${normalizeTitle(noteTitle, "Note partagée")} — Capsule`
    : "Note introuvable — Capsule";
  const url = `/share/${encodeURIComponent(String(token || ""))}`;

  return {
    title,
    description: SHARED_NOTE_DESCRIPTION,
    alternates: { canonical: url },
    ...createSocialMetadata({
      title,
      description: SHARED_NOTE_DESCRIPTION,
      url,
      type: "article",
    }),
  };
}
