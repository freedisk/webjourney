import { getSupabaseAdmin } from "./supabase-admin.js";
import { NOTE_IMAGES_BUCKET } from "./note-images.js";

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const IMAGE_FILE = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}\.(jpg|png|webp)$/i;
export class NoteOperationError extends Error {
  constructor(code, status = 503) { super(code); this.code = code; this.status = status; }
}

export function validateNoteOperationId(id) {
  if (!UUID.test(id || "")) throw new NoteOperationError("NOTE_REQUEST_INVALID", 400);
}

function adminClient(override) {
  const client = override || getSupabaseAdmin();
  if (!client) throw new NoteOperationError("NOTE_SERVICE_UNAVAILABLE");
  return client;
}

async function rpc(client, name, args) {
  const { data, error } = await client.rpc(name, args);
  if (error) {
    const codes = {
      NOTE_NOT_FOUND: 404, NOTE_NOT_TRASH: 409, NOTE_READ_ONLY: 409,
      NOTE_VERSION_CONFLICT: 409, NOTE_IMAGE_OPERATION_IN_PROGRESS: 409,
      IMAGE_STILL_REFERENCED: 409, IMAGE_REQUEST_INVALID: 400,
    };
    if (Object.hasOwn(codes, error.message)) throw new NoteOperationError(error.message, codes[error.message]);
    throw new NoteOperationError("NOTE_SERVICE_UNAVAILABLE");
  }
  return data;
}

async function ownedNote(client, userId, noteId) {
  validateNoteOperationId(noteId);
  const { data, error } = await client.from("notes")
    .select("id,user_id,deleted_at,purge_started_at,lifecycle_version")
    .eq("id", noteId).eq("user_id", userId).maybeSingle();
  if (error) throw new NoteOperationError("NOTE_SERVICE_UNAVAILABLE");
  if (!data) throw new NoteOperationError("NOTE_NOT_FOUND", 404);
  return data;
}

function safePaths(userId, noteId, rows) {
  const prefix = userId + "/" + noteId + "/";
  const paths = rows.map(row => row.storage_path);
  if (paths.some(path => !path?.startsWith(prefix) || !IMAGE_FILE.test(path.slice(prefix.length)))) {
    throw new NoteOperationError("IMAGE_PATH_INVALID");
  }
  return [...new Set(paths)];
}

async function removePaths(client, paths) {
  for (let offset = 0; offset < paths.length; offset += 1000) {
    const { error } = await client.storage.from(NOTE_IMAGES_BUCKET).remove(paths.slice(offset, offset + 1000));
    if (error) throw new NoteOperationError("IMAGE_CLEANUP_INCOMPLETE");
  }
}

async function listNotePaths(client, userId, noteId) {
  const prefix = userId + "/" + noteId;
  const paths = [];
  for (let offset = 0; ; offset += 1000) {
    const { data, error } = await client.storage.from(NOTE_IMAGES_BUCKET)
      .list(prefix, { limit: 1000, offset, sortBy: { column: "name", order: "asc" } });
    if (error) throw new NoteOperationError("IMAGE_CLEANUP_INCOMPLETE");
    const files = data || [];
    if (files.some(file => !file.id || !IMAGE_FILE.test(file.name))) throw new NoteOperationError("IMAGE_PATH_INVALID");
    paths.push(...files.map(file => prefix + "/" + file.name));
    if (files.length < 1000) break;
  }
  return paths;
}

export async function purgeOwnedNote(userId, noteId, expectedVersion, override) {
  if (!Number.isSafeInteger(expectedVersion) || expectedVersion < 0) throw new NoteOperationError("NOTE_REQUEST_INVALID", 400);
  const client = adminClient(override);
  const note = await ownedNote(client, userId, noteId);
  if (!note.deleted_at) throw new NoteOperationError("NOTE_NOT_TRASH", 409);
  await rpc(client, "begin_note_purge", { p_note_id: noteId, p_user_id: userId, p_expected_version: expectedVersion });
  // Le marqueur en base empêche toute restauration pendant les appels Storage.
  const { data: images, error } = await client.from("note_images").select("id,storage_path").eq("note_id", noteId);
  if (error) throw new NoteOperationError("IMAGE_CLEANUP_INCOMPLETE");
  const registered = safePaths(userId, noteId, images || []);
  const listed = await listNotePaths(client, userId, noteId);
  await removePaths(client, [...new Set([...registered, ...listed])]);
  if ((await listNotePaths(client, userId, noteId)).length) throw new NoteOperationError("IMAGE_CLEANUP_INCOMPLETE");
  await rpc(client, "finish_note_purge", { p_note_id: noteId, p_user_id: userId });
  return { deleted: true };
}

export async function cleanupOwnedImages(userId, noteId, imageIds, override) {
  if (!Array.isArray(imageIds) || !imageIds.length || imageIds.length > 1000 || new Set(imageIds).size !== imageIds.length) {
    throw new NoteOperationError("IMAGE_REQUEST_INVALID", 400);
  }
  imageIds.forEach(validateNoteOperationId);
  const client = adminClient(override);
  const note = await ownedNote(client, userId, noteId);
  if (note.deleted_at || note.purge_started_at) throw new NoteOperationError("NOTE_READ_ONLY", 409);
  const { data: present, error } = await client.from("note_images").select("id").eq("note_id", noteId).in("id", imageIds);
  if (error) throw new NoteOperationError("NOTE_SERVICE_UNAVAILABLE");
  // Une reprise peut retrouver des métadonnées déjà retirées par le premier appel.
  const remaining = (present || []).map(image => image.id);
  if (!remaining.length) return { removed: 0 };
  const images = await rpc(client, "begin_note_image_cleanup", {
    p_note_id: noteId, p_user_id: userId, p_image_ids: remaining,
  });
  await removePaths(client, safePaths(userId, noteId, images || []));
  await rpc(client, "finish_note_image_cleanup", { p_note_id: noteId, p_user_id: userId, p_image_ids: remaining });
  return { removed: remaining.length };
}
