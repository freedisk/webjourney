import {
  NOTE_IMAGES_BUCKET,
  buildImageStoragePath,
  extractImageIds,
  getStoragePathExtension,
  replaceImageIds,
} from "./note-images.js";
import { noteOperationRequest } from "./note-operations-client.js";

function notifyProgress(onProgress, payload) {
  if (typeof onProgress !== "function") return;
  try { onProgress(payload); } catch { /* Un observateur ne bloque pas le Storage. */ }
}

export async function removeStoredImages(supabase, images) {
  const groups = Map.groupBy(images || [], (image) => image.note_id);
  for (const [noteId, rows] of groups) {
    await noteOperationRequest(supabase, noteId, "images/cleanup", { imageIds: rows.map(image => image.id) });
  }
}

async function prepareImages(supabase, noteId, images) {
  const { data, error } = await supabase.rpc("prepare_note_images", {
    p_note_id: noteId,
    p_images: images.map(({ id, original_name, mime_type, size_bytes }) => ({ id, original_name, mime_type, size_bytes })),
  });
  if (error || !Array.isArray(data) || data.length !== images.length) throw new Error("Réservation des images impossible. Actualise la note avant de réessayer.");
  return data;
}

async function finishImages(supabase, noteId, rows) {
  const { data, error } = await supabase.rpc("finish_note_image_uploads", {
    p_note_id: noteId, p_image_ids: rows.map(image => image.id),
  });
  if (error) throw new Error("Finalisation des images impossible. Le brouillon est conservé.");
  return data || rows;
}

// Réserver les métadonnées avant l'upload pour protéger les déplacements concurrents.
export async function uploadPendingImages({ supabase, userId, noteId, content, pendingImages, onProgress }) {
  const referenced = new Set(extractImageIds(content));
  const images = pendingImages.filter(image => referenced.has(image.id));
  if (!images.length) {
    notifyProgress(onProgress, { phase: "complete", current: 0, completed: 0, total: 0, percent: 100 });
    return [];
  }
  const rows = await prepareImages(supabase, noteId, images.map(image => ({
    id: image.id, note_id: noteId,
    storage_path: buildImageStoragePath(userId, noteId, image.id, image.file.type),
    original_name: image.originalName || image.file.name || "image", mime_type: image.file.type, size_bytes: image.file.size,
  })));
  try {
    for (let index = 0; index < images.length; index += 1) {
      const image = images[index];
      const row = rows.find(candidate => candidate.id === image.id);
      if (!row.upload_started_at) continue;
      notifyProgress(onProgress, { phase: "uploading", current: index + 1, completed: index, total: images.length, percent: Math.round(index / images.length * 85) });
      const { error } = await supabase.storage.from(NOTE_IMAGES_BUCKET).upload(row.storage_path, image.file, {
        cacheControl: "3600", contentType: image.file.type, upsert: false,
      });
      if (error) throw new Error("Envoi de l’image impossible. Le brouillon est conservé.");
      notifyProgress(onProgress, { phase: "uploading", current: index + 1, completed: index + 1, total: images.length, percent: Math.round((index + 1) / images.length * 85) });
    }
    notifyProgress(onProgress, { phase: "metadata", current: images.length, completed: images.length, total: images.length, percent: 94 });
    const result = await finishImages(supabase, noteId, rows);
    notifyProgress(onProgress, { phase: "complete", current: images.length, completed: images.length, total: images.length, percent: 100 });
    return result;
  } catch (error) {
    notifyProgress(onProgress, { phase: "rollback", current: 0, completed: 0, total: images.length, percent: 0 });
    try { await removeStoredImages(supabase, rows); }
    catch { throw new Error(error.message + " Termine le nettoyage des images depuis les actions de la note avant de réessayer."); }
    throw error;
  }
}

// Une copie réserve ses propres UUID ; aucune référence de la source n'est réutilisée.
export async function duplicateStoredImages({ supabase, userId, targetNoteId, content, sourceImages, onProgress }) {
  const referenced = new Set(extractImageIds(content));
  const images = sourceImages.filter(image => referenced.has(image.id));
  if (!images.length) return { content, images: [] };
  const replacements = {};
  const candidates = images.map(image => {
    const id = crypto.randomUUID();
    replacements[image.id] = id;
    const extension = getStoragePathExtension(image.storage_path);
    if (!extension) throw new Error("Extension d’image introuvable.");
    return { ...image, id, note_id: targetNoteId, storage_path: `${userId}/${targetNoteId}/${id}.${extension}` };
  });
  const rows = await prepareImages(supabase, targetNoteId, candidates);
  try {
    for (let index = 0; index < images.length; index += 1) {
      const image = images[index];
      const row = rows.find(candidate => candidate.id === replacements[image.id]);
      notifyProgress(onProgress, { phase: "copying", current: index + 1, completed: index, total: images.length, percent: Math.round(index / images.length * 85) });
      const { error } = await supabase.storage.from(NOTE_IMAGES_BUCKET).copy(image.storage_path, row.storage_path);
      if (error) throw new Error("Copie de l’image impossible.");
    }
    const result = await finishImages(supabase, targetNoteId, rows);
    notifyProgress(onProgress, { phase: "complete", current: images.length, completed: images.length, total: images.length, percent: 100 });
    return { content: replaceImageIds(content, replacements), images: result };
  } catch (error) {
    try { await removeStoredImages(supabase, rows); }
    catch { throw new Error(error.message + " Termine le nettoyage des images de la copie avant de réessayer."); }
    throw error;
  }
}

export async function createSignedImageMap(supabase, images, expiresIn = 3600) {
  if (!images || images.length === 0) return {};

  const { data, error } = await supabase.storage
    .from(NOTE_IMAGES_BUCKET)
    .createSignedUrls(images.map((image) => image.storage_path), expiresIn);

  if (error) throw new Error("Signature des images impossible : " + error.message);

  const signedByPath = new Map(
    (data || [])
      .filter((item) => item.signedUrl && !item.error)
      .map((item) => [item.path, item.signedUrl])
  );

  return Object.fromEntries(
    images
      .filter((image) => signedByPath.has(image.storage_path))
      .map((image) => [image.id, signedByPath.get(image.storage_path)])
  );
}
