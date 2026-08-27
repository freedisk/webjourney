import { readFile } from "node:fs/promises";
import path from "node:path";
import { describe, expect, it } from "vitest";
import {
  createSharedNoteMetadata,
  createSocialMetadata,
  SHARED_NOTE_DESCRIPTION,
  SITE_DESCRIPTION,
  SITE_TITLE,
  SITE_URL,
  SOCIAL_IMAGE,
  SOCIAL_IMAGE_PATH,
} from "../lib/site-metadata";

describe("aperçu social SHARE-001", () => {
  it("déclare une carte Open Graph complète pour l'application", () => {
    const metadata = createSocialMetadata();

    expect(new URL(metadata.openGraph.url, SITE_URL).href).toBe(`${SITE_URL}/`);
    expect(metadata.openGraph).toMatchObject({
      title: SITE_TITLE,
      description: SITE_DESCRIPTION,
      siteName: "Capsule",
      locale: "fr_FR",
      type: "website",
    });
    expect(metadata.openGraph.images).toEqual([SOCIAL_IMAGE]);
    expect(metadata.twitter).toMatchObject({
      card: "summary_large_image",
      title: SITE_TITLE,
      description: SITE_DESCRIPTION,
      images: [SOCIAL_IMAGE_PATH],
    });
  });

  it("annonce une image PNG 1200 x 630 avec un texte alternatif", () => {
    expect(SOCIAL_IMAGE).toEqual({
      url: "/opengraph-image",
      width: 1200,
      height: 630,
      alt: expect.stringContaining("Capsule"),
      type: "image/png",
    });
  });

  it("produit une carte de note publique sans reprendre son contenu", () => {
    const privateBody = "Corps privé qui ne doit jamais entrer dans la carte";
    const metadata = createSharedNoteMetadata(
      "Compte rendu projet",
      "partage-test",
      privateBody,
    );
    const serialized = JSON.stringify(metadata);

    expect(metadata).toMatchObject({
      title: "Compte rendu projet — Capsule",
      description: SHARED_NOTE_DESCRIPTION,
      alternates: { canonical: "/share/partage-test" },
      openGraph: {
        title: "Compte rendu projet — Capsule",
        type: "article",
        url: "/share/partage-test",
      },
    });
    expect(serialized).not.toContain(privateBody);
  });

  it("normalise un titre de note hostile et borne sa présence dans la carte", () => {
    const metadata = createSharedNoteMetadata(
      `  Titre\u0000 avec\n espaces ${"x".repeat(180)}  `,
      "jeton avec/espace",
    );

    expect(metadata.title).not.toMatch(/[\u0000-\u001f\u007f]/);
    expect(metadata.openGraph.title.length).toBeLessThanOrEqual(90);
    expect(metadata.alternates.canonical).toBe("/share/jeton%20avec%2Fespace");
  });

  it("reste explicite lorsqu'un lien partagé est invalide ou révoqué", () => {
    const metadata = createSharedNoteMetadata(null, "ancien-jeton");

    expect(metadata.title).toBe("Note introuvable — Capsule");
    expect(metadata.openGraph.title).toBe("Note introuvable — Capsule");
    expect(metadata.description).toBe(SHARED_NOTE_DESCRIPTION);
  });

  it("génère la carte depuis l'icône PWA existante sans contenu de note", async () => {
    const source = await readFile(
      path.join(process.cwd(), "app", "opengraph-image.js"),
      "utf8",
    );

    expect(source).toContain('from "next/og"');
    expect(source).toContain('"icon-512.png"');
    expect(source).toContain("width: 1200");
    expect(source).toContain("height: 630");
    expect(source).not.toContain("note.contenu");
    expect(source).not.toContain("storage_path");
  });

  it("branche les métadonnées globales et celles des liens de partage", async () => {
    const [layout, sharedPage] = await Promise.all([
      readFile(path.join(process.cwd(), "app", "layout.js"), "utf8"),
      readFile(path.join(process.cwd(), "app", "share", "[token]", "page.js"), "utf8"),
    ]);

    expect(layout).toContain("metadataBase: new URL(SITE_URL)");
    expect(layout).toContain("...createSocialMetadata()");
    expect(sharedPage).toContain("createSharedNoteMetadata(data?.titre, token)");
  });
});
