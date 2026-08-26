import {
  NOTE_IMAGES_BUCKET,
  buildImageStoragePath,
  extractImageIds,
  getStoragePathExtension,
  replaceImageIds,
} from "./note-images.js";

async function removeStoragePaths(supabase, paths) {
  if (paths.length === 0) return;
  const { error } = await supabase.storage.from(NOTE_IMAGES_BUCKET).remove(paths);
  if (error) throw new Error("Suppression Storage impossible : " + error.message);
}

function notifyProgress(onProgress, payload) {
  if (typeof onProgress !== "function") return;
  try {
    onProgress(payload);
  } catch {
    // Un observateur UI ne doit jamais interrompre une opération Storage.
  }
}

export async function removeStoredImageFiles(supabase, images) {
  if (!images || images.length === 0) return;
  await removeStoragePaths(supabase, images.map((image) => image.storage_path));
}

// Envoyer les images référencées puis enregistrer leurs métadonnées.
export async function uploadPendingImages({
  supabase,
  userId,
  noteId,
  content,
  pendingImages,
  onProgress,
}) {
  const referencedIds = new Set(extractImageIds(content));
  const imagesToUpload = pendingImages.filter((image) => referencedIds.has(image.id));
  if (imagesToUpload.length === 0) {
    notifyProgress(onProgress, { phase: "complete", current: 0, completed: 0, total: 0, percent: 100 });
    return [];
  }

  const uploadedRows = [];

  try {
    for (let index = 0; index < imagesToUpload.length; index += 1) {
      const image = imagesToUpload[index];
      notifyProgress(onProgress, {
        phase: "uploading",
        current: index + 1,
        completed: index,
        total: imagesToUpload.length,
        percent: Math.round((index / imagesToUpload.length) * 85),
        imageId: image.id,
      });
      const storagePath = buildImageStoragePath(userId, noteId, image.id, image.file.type);
      const { error } = await supabase.storage
        .from(NOTE_IMAGES_BUCKET)
        .upload(storagePath, image.file, {
          cacheControl: "3600",
          contentType: image.file.type,
          upsert: false,
        });

      if (error) throw new Error("Envoi de l'image impossible : " + error.message);

      uploadedRows.push({
        id: image.id,
        note_id: noteId,
        storage_path: storagePath,
        original_name: image.originalName || image.file.name || "image",
        mime_type: image.file.type,
        size_bytes: image.file.size,
      });
      notifyProgress(onProgress, {
        phase: "uploading",
        current: index + 1,
        completed: index + 1,
        total: imagesToUpload.length,
        percent: Math.round(((index + 1) / imagesToUpload.length) * 85),
        imageId: image.id,
      });
    }

    notifyProgress(onProgress, {
      phase: "metadata",
      current: imagesToUpload.length,
      completed: imagesToUpload.length,
      total: imagesToUpload.length,
      percent: 94,
    });
    const { data, error } = await supabase
      .from("note_images")
      .insert(uploadedRows)
      .select();

    if (error) throw new Error("Enregistrement des images impossible : " + error.message);
    notifyProgress(onProgress, {
      phase: "complete",
      current: imagesToUpload.length,
      completed: imagesToUpload.length,
      total: imagesToUpload.length,
      percent: 100,
    });
    return data || uploadedRows;
  } catch (error) {
    notifyProgress(onProgress, {
      phase: "rollback",
      current: uploadedRows.length,
      completed: uploadedRows.length,
      total: imagesToUpload.length,
      percent: 0,
    });
    await removeStoragePaths(
      supabase,
      uploadedRows.map((row) => row.storage_path)
    ).catch(() => {});
    throw error;
  }
}

export async function removeStoredImages(supabase, images) {
  if (!images || images.length === 0) return;
  await removeStoredImageFiles(supabase, images);

  const { error } = await supabase
    .from("note_images")
    .delete()
    .in("id", images.map((image) => image.id));

  if (error) throw new Error("Suppression des métadonnées impossible : " + error.message);
}

// Copier les objets dans le dossier de la nouvelle note et réécrire le Markdown.
export async function duplicateStoredImages({
  supabase,
  userId,
  targetNoteId,
  content,
  sourceImages,
  onProgress,
}) {
  const referencedIds = new Set(extractImageIds(content));
  const imagesToCopy = sourceImages.filter((image) => referencedIds.has(image.id));
  if (imagesToCopy.length === 0) {
    notifyProgress(onProgress, { phase: "complete", current: 0, completed: 0, total: 0, percent: 100 });
    return { content, images: [] };
  }

  const replacements = {};
  const copiedRows = [];

  try {
    for (let index = 0; index < imagesToCopy.length; index += 1) {
      const image = imagesToCopy[index];
      notifyProgress(onProgress, {
        phase: "copying",
        current: index + 1,
        completed: index,
        total: imagesToCopy.length,
        percent: Math.round((index / imagesToCopy.length) * 85),
        imageId: image.id,
      });
      const newId = crypto.randomUUID();
      const extension = getStoragePathExtension(image.storage_path);
      if (!extension) throw new Error("Extension d'image introuvable.");

      const targetPath = `${userId}/${targetNoteId}/${newId}.${extension}`;
      const { error } = await supabase.storage
        .from(NOTE_IMAGES_BUCKET)
        .copy(image.storage_path, targetPath);

      if (error) throw new Error("Copie de l'image impossible : " + error.message);

      replacements[image.id] = newId;
      copiedRows.push({
        id: newId,
        note_id: targetNoteId,
        storage_path: targetPath,
        original_name: image.original_name,
        mime_type: image.mime_type,
        size_bytes: image.size_bytes,
      });
      notifyProgress(onProgress, {
        phase: "copying",
        current: index + 1,
        completed: index + 1,
        total: imagesToCopy.length,
        percent: Math.round(((index + 1) / imagesToCopy.length) * 85),
        imageId: image.id,
      });
    }

    notifyProgress(onProgress, {
      phase: "metadata",
      current: imagesToCopy.length,
      completed: imagesToCopy.length,
      total: imagesToCopy.length,
      percent: 94,
    });
    const { data, error } = await supabase
      .from("note_images")
      .insert(copiedRows)
      .select();

    if (error) throw new Error("Enregistrement des copies impossible : " + error.message);

    notifyProgress(onProgress, {
      phase: "complete",
      current: imagesToCopy.length,
      completed: imagesToCopy.length,
      total: imagesToCopy.length,
      percent: 100,
    });

    return {
      content: replaceImageIds(content, replacements),
      images: data || copiedRows,
    };
  } catch (error) {
    notifyProgress(onProgress, {
      phase: "rollback",
      current: copiedRows.length,
      completed: copiedRows.length,
      total: imagesToCopy.length,
      percent: 0,
    });
    await removeStoragePaths(
      supabase,
      copiedRows.map((row) => row.storage_path)
    ).catch(() => {});
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
