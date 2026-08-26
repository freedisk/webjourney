export const NOTE_IMAGES_BUCKET = "note-images";
export const MAX_IMAGE_SIZE_BYTES = 5 * 1024 * 1024;
export const MAX_IMAGE_INPUT_SIZE_BYTES = 20 * 1024 * 1024;
export const ALLOWED_IMAGE_TYPES = Object.freeze({
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
});

const IMAGE_REFERENCE_PATTERN = /!\[([^\]]*)\]\(capsule-image\/([0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12})\)/gi;
const IMAGE_SOURCE_PATTERN = /^capsule-image\/([0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12})$/i;

function validateImageFileBasics(file) {
  if (!file || typeof file !== "object") {
    return "Fichier image invalide.";
  }

  if (!Object.hasOwn(ALLOWED_IMAGE_TYPES, file.type)) {
    return "Format non pris en charge. Utilise une image JPEG, PNG ou WebP.";
  }

  if (!Number.isFinite(file.size) || file.size <= 0) {
    return "L'image est vide.";
  }

  return null;
}

// Le fichier source peut dépasser la limite Storage : il sera optimisé avant l'envoi.
export function validateImageInputFile(file) {
  const basicError = validateImageFileBasics(file);
  if (basicError) return basicError;

  if (file.size > MAX_IMAGE_INPUT_SIZE_BYTES) {
    return "L'image source dépasse la limite de 20 Mio.";
  }

  return null;
}

// Le bucket répète cette contrainte sur le fichier final réellement envoyé.
export function validateImageFile(file) {
  const basicError = validateImageFileBasics(file);
  if (basicError) return basicError;

  if (file.size > MAX_IMAGE_SIZE_BYTES) {
    return "L'image dépasse la limite de 5 Mio.";
  }

  return null;
}

export function sanitizeImageAlt(fileName) {
  const withoutExtension = String(fileName || "")
    .replace(/\.[^.]+$/, "")
    .replace(/[\[\]\r\n]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();

  return withoutExtension || "Image";
}

export function createImageReference(imageId, altText = "Image") {
  const safeAlt = sanitizeImageAlt(altText);
  return `![${safeAlt}](capsule-image/${imageId})`;
}

export function getImageIdFromSource(source) {
  const match = String(source || "").match(IMAGE_SOURCE_PATTERN);
  return match ? match[1].toLowerCase() : null;
}

export function extractImageReferences(content) {
  const references = [];
  const seen = new Set();

  for (const match of String(content || "").matchAll(IMAGE_REFERENCE_PATTERN)) {
    const id = match[2].toLowerCase();
    if (seen.has(id)) continue;
    seen.add(id);
    references.push({ id, alt: sanitizeImageAlt(match[1]) });
  }

  return references;
}

export function extractImageIds(content) {
  return extractImageReferences(content).map((reference) => reference.id);
}

export function insertTextAtSelection(value, insertion, selectionStart, selectionEnd) {
  const currentValue = String(value || "");
  const start = Math.max(0, Math.min(selectionStart ?? currentValue.length, currentValue.length));
  const end = Math.max(start, Math.min(selectionEnd ?? start, currentValue.length));
  const before = currentValue.slice(0, start);
  const after = currentValue.slice(end);
  const prefix = before && !before.endsWith("\n") ? "\n\n" : "";
  const suffix = after && !after.startsWith("\n") ? "\n\n" : "";
  const insertedText = `${prefix}${insertion}${suffix}`;

  return {
    value: before + insertedText + after,
    cursor: before.length + insertedText.length,
  };
}

export function removeImageReference(content, imageId) {
  const targetId = String(imageId || "").toLowerCase();
  return String(content || "")
    .replace(IMAGE_REFERENCE_PATTERN, (fullMatch, _alt, currentId) => (
      currentId.toLowerCase() === targetId ? "" : fullMatch
    ))
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

export function replaceImageIds(content, replacements) {
  return String(content || "").replace(
    IMAGE_REFERENCE_PATTERN,
    (fullMatch, alt, currentId) => {
      const replacement = replacements[currentId.toLowerCase()];
      return replacement ? createImageReference(replacement, alt) : fullMatch;
    }
  );
}

export function stripImagesForText(content) {
  return String(content || "")
    .replace(IMAGE_REFERENCE_PATTERN, (_fullMatch, alt) => `[Image : ${sanitizeImageAlt(alt)}]`)
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

export function buildImageStoragePath(userId, noteId, imageId, mimeType) {
  const extension = ALLOWED_IMAGE_TYPES[mimeType];
  if (!extension) throw new Error("Type d'image non pris en charge.");
  return `${userId}/${noteId}/${imageId}.${extension}`;
}

export function getStoragePathExtension(storagePath) {
  const match = String(storagePath || "").match(/\.([a-z0-9]+)$/i);
  return match ? match[1].toLowerCase() : null;
}
