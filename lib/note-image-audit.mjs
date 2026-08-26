import { buildImageStoragePath, extractImageIds } from "./note-images.js";

function sortStrings(values) {
  return [...values].sort((left, right) => left.localeCompare(right));
}

export function classifyImageIntegrity({ notes = [], metadata = [], storagePaths = [] }) {
  const notesById = new Map(notes.map((note) => [note.id, note]));
  const metadataByReference = new Map(
    metadata.map((image) => [`${image.note_id}:${image.id}`, image])
  );
  const metadataPaths = new Set(metadata.map((image) => image.storage_path));
  const objectPaths = new Set(storagePaths);
  const references = new Set();

  for (const note of notes) {
    for (const imageId of extractImageIds(note.contenu)) {
      references.add(`${note.id}:${imageId}`);
    }
  }

  const metadataWithoutObject = metadata
    .filter((image) => !objectPaths.has(image.storage_path))
    .map((image) => image.id);
  const objectsWithoutMetadata = storagePaths
    .filter((storagePath) => !metadataPaths.has(storagePath));
  const metadataWithoutReference = metadata
    .filter((image) => !references.has(`${image.note_id}:${image.id}`))
    .map((image) => image.id);
  const referencesWithoutMetadata = [...references]
    .filter((reference) => !metadataByReference.has(reference));
  const metadataWithoutNote = metadata
    .filter((image) => !notesById.has(image.note_id))
    .map((image) => image.id);
  const metadataPathMismatch = metadata
    .filter((image) => {
      const note = notesById.get(image.note_id);
      if (!note?.user_id) return false;
      try {
        return image.storage_path !== buildImageStoragePath(
          note.user_id,
          image.note_id,
          image.id,
          image.mime_type
        );
      } catch {
        return true;
      }
    })
    .map((image) => image.id);

  const findings = {
    metadataWithoutObject: sortStrings(metadataWithoutObject),
    objectsWithoutMetadata: sortStrings(objectsWithoutMetadata),
    metadataWithoutReference: sortStrings(metadataWithoutReference),
    referencesWithoutMetadata: sortStrings(referencesWithoutMetadata),
    metadataWithoutNote: sortStrings(metadataWithoutNote),
    metadataPathMismatch: sortStrings(metadataPathMismatch),
  };

  return {
    clean: Object.values(findings).every((items) => items.length === 0),
    findings,
    counts: Object.fromEntries(
      Object.entries(findings).map(([key, items]) => [key, items.length])
    ),
  };
}
