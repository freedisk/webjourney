import { describe, expect, it, vi } from "vitest";
import { purgeOwnedNote, cleanupOwnedImages } from "../lib/note-operations-server.js";
import { noteOperationError } from "../lib/note-operations-http.js";
const userId = "10000000-0000-4000-8000-000000000001";
const noteId = "20000000-0000-4000-8000-000000000001";
const imageId = "30000000-0000-4000-8000-000000000001";
const path = `${userId}/${noteId}/${imageId}.webp`;

function client({ missing = false, removeError = false, badPath = false, active = false } = {}) {
  const remove = vi.fn().mockResolvedValue({ error: removeError ? { message: "secret provider data" } : null });
  const list = vi.fn().mockResolvedValue({ data: [], error: null });
  const rpc = vi.fn().mockImplementation(async name => ({ data: name === "begin_note_image_cleanup" ? [{ id: imageId, storage_path: badPath ? "another-owner/file" : path }] : true, error: null }));
  const from = vi.fn(table => {
    const query = { select: () => query, eq: () => query, in: () => query,
      maybeSingle: async () => ({ data: missing ? null : { id: noteId, user_id: userId, deleted_at: active ? null : "now", lifecycle_version: 1 }, error: null }),
      then: resolve => resolve({ data: [{ id: imageId, storage_path: badPath ? "another-owner/file" : path }], error: null }),
    };
    if (table !== "notes" && table !== "note_images") throw new Error("Unexpected table");
    return query;
  });
  return { from, rpc, storage: { from: vi.fn(() => ({ remove, list })) }, remove, list };
}
describe("nettoyage serveur des notes privées", () => {
  it("refuse une note absente du propriétaire avant toute opération Storage", async () => {
    const admin = client({ missing: true });
    await expect(purgeOwnedNote(userId, noteId, 1, admin)).rejects.toMatchObject({ code: "NOTE_NOT_FOUND" });
    expect(admin.storage.from).not.toHaveBeenCalled();
  });
  it("marque la purge avant les fichiers et termine seulement après vérification", async () => {
    const admin = client();
    await expect(purgeOwnedNote(userId, noteId, 1, admin)).resolves.toEqual({ deleted: true });
    expect(admin.remove).toHaveBeenCalledWith([path]);
    expect(admin.list).toHaveBeenCalledTimes(2);
    expect(admin.rpc.mock.calls.map(([name]) => name)).toEqual(["begin_note_purge", "finish_note_purge"]);
    expect(admin.rpc.mock.invocationCallOrder[0]).toBeLessThan(admin.remove.mock.invocationCallOrder[0]);
  });
  it("conserve le marqueur et la note lorsque Storage échoue, puis accepte la reprise", async () => {
    const admin = client({ removeError: true });
    await expect(purgeOwnedNote(userId, noteId, 1, admin)).rejects.toMatchObject({ code: "IMAGE_CLEANUP_INCOMPLETE" });
    expect(admin.rpc).toHaveBeenCalledTimes(1);
    admin.remove.mockResolvedValue({ error: null });
    await expect(purgeOwnedNote(userId, noteId, 1, admin)).resolves.toEqual({ deleted: true });
  });
  it("ne transmet aucun chemin hors du dossier de la note à Storage", async () => {
    const admin = client({ badPath: true, active: true });
    await expect(cleanupOwnedImages(userId, noteId, [imageId], admin)).rejects.toMatchObject({ code: "IMAGE_PATH_INVALID" });
    expect(admin.remove).not.toHaveBeenCalled();
  });
  it("refuse la purge d'une note active et les identifiants invalides", async () => {
    await expect(purgeOwnedNote(userId, noteId, 1, client({ active: true }))).rejects.toMatchObject({ code: "NOTE_NOT_TRASH" });
    await expect(cleanupOwnedImages(userId, noteId, [imageId, imageId], client())).rejects.toMatchObject({ code: "IMAGE_REQUEST_INVALID" });
  });
  it("masque les erreurs fournisseur et reste hors cache", async () => {
    const response = noteOperationError(new Error("private note / secret provider"));
    expect(await response.text()).not.toContain("secret provider");
    expect(response.headers.get("Cache-Control")).toContain("no-store");
  });
});
