import { describe, expect, it, vi } from "vitest";
import { noteScope, noteCanRestore, noteScopeCounts, notesInSearchScope, lifecycleUndo, transitionNote } from "../lib/note-lifecycle.js";

const active = { id: "a", lifecycle_version: 0 };
const archived = { id: "b", archived_at: "2026-10-10" };
const trash = { id: "c", archived_at: "2026-10-10", deleted_at: "2026-10-10" };
describe("périmètres et annulation", () => {
  it("exclut la corbeille de la recherche ordinaire, y compris les anciennes archives", () => {
    expect(notesInSearchScope([active, archived, trash], "all")).toEqual([active, archived]);
    expect(notesInSearchScope([active, archived, trash])).toEqual([active]);
    expect(noteScopeCounts([active, archived, trash])).toEqual({ active: 1, archived: 1, trash: 1 });
    expect(noteScope(trash)).toBe("trash");
  });
  it("restaure seulement avant le début d'une purge", () => {
    expect(noteCanRestore(trash)).toBe(true);
    expect(noteCanRestore({ ...trash, purge_started_at: "now" })).toBe(false);
    expect(lifecycleUndo(archived, "trash")).toBe("restore");
    expect(lifecycleUndo(active, "archive")).toBe("unarchive");
  });
  it("annule avec une version, sans réécrire texte, tags ou images", async () => {
    const rpc = vi.fn().mockResolvedValue({ data: { id: "a", lifecycle_version: 2 }, error: null });
    await transitionNote({ rpc }, { ...active, lifecycle_version: 1, contenu: "Brouillon à ne pas recopier" }, "unarchive");
    expect(rpc).toHaveBeenCalledWith("transition_note_lifecycle", { p_note_id: "a", p_action: "unarchive", p_expected_version: 1 });
    rpc.mockResolvedValue({ error: { message: "NOTE_VERSION_CONFLICT" } });
    await expect(transitionNote({ rpc }, active, "trash")).rejects.toThrow("changé ailleurs");
  });
});
