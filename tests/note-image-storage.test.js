import { describe, expect, it, vi } from "vitest";
import {
  createSignedImageMap,
  duplicateStoredImages,
  uploadPendingImages,
} from "../lib/note-image-storage.js";
import { createImageReference } from "../lib/note-images.js";

vi.mock("../lib/note-operations-client.js", () => ({ noteOperationRequest: vi.fn().mockResolvedValue({ removed: 1 }) }));
import { noteOperationRequest } from "../lib/note-operations-client.js";

const USER_ID = "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa";
const NOTE_ID = "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb";
const IMAGE_ID = "11111111-1111-4111-8111-111111111111";
const SECOND_IMAGE_ID = "22222222-2222-4222-8222-222222222222";

function createUploadClient({ uploadError = null, insertError = null } = {}) {
  const upload = vi.fn().mockResolvedValue({ error: uploadError });
  const remove = vi.fn().mockResolvedValue({ error: null });
  const insert = vi.fn();
  const rpc = vi.fn(async (name, args) => {
    if (name === "prepare_note_images") return { data: args.p_images.map(image => ({ ...image, note_id: NOTE_ID, storage_path: `${USER_ID}/${NOTE_ID}/${image.id}.${image.mime_type === "image/webp" ? "webp" : "png"}`, upload_started_at: "2026-10-10T20:00:00Z" })), error: null };
    return { data: null, error: insertError };
  });
  return { client: { storage: { from: vi.fn(() => ({ upload, remove })) }, rpc }, upload, remove, insert, rpc };

}

describe("envoi des images en attente", () => {
  it("n'envoie que les images encore référencées dans le Markdown", async () => {
    const { client, upload, rpc } = createUploadClient();
    const onProgress = vi.fn();
    const pendingImages = [
      {
        id: IMAGE_ID,
        originalName: "capture originale.png",
        file: { name: "capture.webp", type: "image/webp", size: 1024 },
      },
      { id: SECOND_IMAGE_ID, file: { name: "inutile.webp", type: "image/webp", size: 2048 } },
    ];

    const rows = await uploadPendingImages({
      supabase: client,
      userId: USER_ID,
      noteId: NOTE_ID,
      content: createImageReference(IMAGE_ID, "Capture"),
      pendingImages,
      onProgress,
    });

    expect(upload).toHaveBeenCalledTimes(1);
    expect(upload).toHaveBeenCalledWith(
      `${USER_ID}/${NOTE_ID}/${IMAGE_ID}.webp`,
      pendingImages[0].file,
      expect.objectContaining({ contentType: "image/webp", upsert: false })
    );
    expect(rpc).toHaveBeenCalledTimes(2);
    expect(rows[0]).toMatchObject({
      id: IMAGE_ID,
      note_id: NOTE_ID,
      original_name: "capture originale.png",
      size_bytes: 1024,
    });
    expect(onProgress.mock.calls.map(([progress]) => progress.phase)).toEqual([
      "uploading",
      "uploading",
      "metadata",
      "complete",
    ]);
    expect(onProgress).toHaveBeenLastCalledWith(expect.objectContaining({ percent: 100 }));
  });

  it("ne crée aucune métadonnée quand aucune image n'est référencée", async () => {
    const { client, upload, rpc } = createUploadClient();
    const rows = await uploadPendingImages({
      supabase: client,
      userId: USER_ID,
      noteId: NOTE_ID,
      content: "Texte seul",
      pendingImages: [{ id: IMAGE_ID, file: { name: "a.png", type: "image/png", size: 1 } }],
    });

    expect(rows).toEqual([]);
    expect(upload).not.toHaveBeenCalled();
    expect(rpc).not.toHaveBeenCalled();
  });

  it("supprime l'objet déjà envoyé si l'écriture des métadonnées échoue", async () => {
    const { client } = createUploadClient({
      insertError: { message: "métadonnées indisponibles" },
    });
    const image = {
      id: IMAGE_ID,
      file: { name: "capture.png", type: "image/png", size: 1024 },
    };

    await expect(uploadPendingImages({
      supabase: client,
      userId: USER_ID,
      noteId: NOTE_ID,
      content: createImageReference(IMAGE_ID),
      pendingImages: [image],
    })).rejects.toThrow("Finalisation des images impossible");

    expect(noteOperationRequest).toHaveBeenCalledWith(client, NOTE_ID, "images/cleanup", { imageIds: [IMAGE_ID] });
  });
});

describe("duplication et signature", () => {
  it("copie l'objet, crée une nouvelle métadonnée et réécrit le contenu", async () => {
    const copy = vi.fn().mockResolvedValue({ error: null });
    const remove = vi.fn().mockResolvedValue({ error: null });
    const { client } = createUploadClient();
    client.storage.from = vi.fn(() => ({ copy, remove }));
    const sourceImage = {
      id: IMAGE_ID,
      storage_path: `${USER_ID}/source/${IMAGE_ID}.png`,
      original_name: "capture.png",
      mime_type: "image/png",
      size_bytes: 42,
    };

    const result = await duplicateStoredImages({
      supabase: client,
      userId: USER_ID,
      targetNoteId: NOTE_ID,
      content: createImageReference(IMAGE_ID, "Capture"),
      sourceImages: [sourceImage],
    });

    expect(copy).toHaveBeenCalledTimes(1);
    expect(result.images).toHaveLength(1);
    expect(result.images[0].id).not.toBe(IMAGE_ID);
    expect(result.content).toContain(`capsule-image/${result.images[0].id}`);
    expect(result.content).not.toContain(`capsule-image/${IMAGE_ID}`);
  });

  it("associe chaque chemin signé à son identifiant d'image", async () => {
    const image = { id: IMAGE_ID, storage_path: `${USER_ID}/${NOTE_ID}/${IMAGE_ID}.png` };
    const createSignedUrls = vi.fn().mockResolvedValue({
      data: [{ path: image.storage_path, signedUrl: "https://signed.example/image", error: null }],
      error: null,
    });
    const client = { storage: { from: vi.fn(() => ({ createSignedUrls })) } };

    await expect(createSignedImageMap(client, [image])).resolves.toEqual({
      [IMAGE_ID]: "https://signed.example/image",
    });
  });
});
