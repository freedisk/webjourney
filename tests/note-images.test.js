import { describe, expect, it } from "vitest";
import {
  MAX_IMAGE_INPUT_SIZE_BYTES,
  MAX_IMAGE_SIZE_BYTES,
  buildImageStoragePath,
  createImageReference,
  extractImageIds,
  extractImageReferences,
  getImageIdFromSource,
  insertTextAtSelection,
  removeImageReference,
  replaceImageIds,
  sanitizeImageAlt,
  stripImagesForText,
  validateImageFile,
  validateImageInputFile,
} from "../lib/note-images.js";

const IMAGE_ID = "11111111-1111-4111-8111-111111111111";
const SECOND_IMAGE_ID = "22222222-2222-4222-8222-222222222222";

describe("validation des fichiers image", () => {
  it("accepte les formats autorisés sous 5 Mio", () => {
    expect(validateImageFile({ type: "image/png", size: 1024 })).toBeNull();
    expect(validateImageFile({ type: "image/jpeg", size: MAX_IMAGE_SIZE_BYTES })).toBeNull();
    expect(validateImageFile({ type: "image/webp", size: 2048 })).toBeNull();
  });

  it("refuse les formats actifs, les fichiers vides et les fichiers trop grands", () => {
    expect(validateImageFile({ type: "image/svg+xml", size: 100 })).toContain("Format");
    expect(validateImageFile({ type: "image/png", size: 0 })).toContain("vide");
    expect(validateImageFile({ type: "image/png", size: MAX_IMAGE_SIZE_BYTES + 1 })).toContain("5 Mio");
  });

  it("accepte une source lourde à compresser mais conserve une limite de préparation", () => {
    expect(validateImageInputFile({
      type: "image/jpeg",
      size: MAX_IMAGE_SIZE_BYTES + 1,
    })).toBeNull();
    expect(validateImageInputFile({
      type: "image/jpeg",
      size: MAX_IMAGE_INPUT_SIZE_BYTES + 1,
    })).toContain("20 Mio");
  });
});

describe("références Markdown privées", () => {
  it("nettoie le texte alternatif et crée une référence stable", () => {
    expect(sanitizeImageAlt("  capture[écran].png ")).toBe("capture écran");
    expect(createImageReference(IMAGE_ID, "capture.png")).toBe(
      `![capture](capsule-image/${IMAGE_ID})`
    );
  });

  it("extrait les références dans l'ordre sans doublon", () => {
    const content = [
      createImageReference(IMAGE_ID, "Première"),
      createImageReference(SECOND_IMAGE_ID, "Deuxième"),
      createImageReference(IMAGE_ID, "Copie"),
    ].join("\n");

    expect(extractImageIds(content)).toEqual([IMAGE_ID, SECOND_IMAGE_ID]);
    expect(extractImageReferences(content)).toEqual([
      { id: IMAGE_ID, alt: "Première" },
      { id: SECOND_IMAGE_ID, alt: "Deuxième" },
    ]);
    expect(getImageIdFromSource(`capsule-image/${IMAGE_ID}`)).toBe(IMAGE_ID);
    expect(getImageIdFromSource("javascript:alert(1)")).toBeNull();
  });

  it("insère une image à la sélection et restitue la position du curseur", () => {
    const result = insertTextAtSelection("Avant après", "IMAGE", 6, 6);
    expect(result.value).toBe("Avant \n\nIMAGE\n\naprès");
    expect(result.cursor).toBe("Avant \n\nIMAGE\n\n".length);
  });

  it("retire une référence précise sans supprimer les autres", () => {
    const content = `${createImageReference(IMAGE_ID)}\n\n${createImageReference(SECOND_IMAGE_ID)}`;
    expect(removeImageReference(content, IMAGE_ID)).toBe(createImageReference(SECOND_IMAGE_ID));
  });

  it("réécrit les identifiants lors d'une duplication", () => {
    const content = createImageReference(IMAGE_ID, "Schéma");
    expect(replaceImageIds(content, { [IMAGE_ID]: SECOND_IMAGE_ID })).toBe(
      createImageReference(SECOND_IMAGE_ID, "Schéma")
    );
  });

  it("transforme les images en texte lisible pour la copie, la recherche et le résumé", () => {
    const content = `Début\n\n${createImageReference(IMAGE_ID, "Facture")}\n\nFin`;
    expect(stripImagesForText(content)).toBe("Début\n\n[Image : Facture]\n\nFin");
  });
});

describe("chemins Supabase Storage", () => {
  it("construit un chemin isolé par utilisateur et note", () => {
    expect(buildImageStoragePath("user-1", "note-1", IMAGE_ID, "image/png")).toBe(
      `user-1/note-1/${IMAGE_ID}.png`
    );
  });

  it("refuse un type MIME inconnu", () => {
    expect(() => buildImageStoragePath("user", "note", IMAGE_ID, "image/gif")).toThrow(
      "Type d'image"
    );
  });
});
