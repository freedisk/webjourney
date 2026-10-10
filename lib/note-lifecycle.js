export const NOTE_SCOPES = Object.freeze([
  { id: "active", label: "Notes" },
  { id: "archived", label: "Archives" },
  { id: "trash", label: "Corbeille" },
]);

export function noteScope(note) {
  if (note?.deleted_at || note?.purge_started_at) return "trash";
  return note?.archived_at ? "archived" : "active";
}

export function noteIsWritable(note) {
  return Boolean(note) && noteScope(note) !== "trash";
}

export function noteCanRestore(note) {
  return Boolean(note?.deleted_at) && !note?.purge_started_at;
}

export function noteScopeCounts(notes) {
  return notes.reduce((counts, note) => {
    counts[noteScope(note)] += 1;
    return counts;
  }, { active: 0, archived: 0, trash: 0 });
}

export function notesInSearchScope(notes, scope = "active") {
  return notes.filter((note) => scope === "all"
    ? noteScope(note) !== "trash"
    : noteScope(note) === scope);
}

export function lifecycleUndo(note, action) {
  const source = noteScope(note);
  if (action === "trash") return "restore";
  if (action === "archive" && source === "active") return "unarchive";
  if (action === "unarchive" && source === "archived") return "archive";
  return null;
}

export async function transitionNote(supabase, note, action) {
  const { data, error } = await supabase.rpc("transition_note_lifecycle", {
    p_note_id: note.id,
    p_action: action,
    p_expected_version: Number(note.lifecycle_version || 0),
  });
  if (error) {
    const code = error.message || "";
    const messages = {
      NOTE_VERSION_CONFLICT: "L’état de cette note a changé ailleurs. Actualise avant de réessayer.",
      NOTE_NOT_FOUND: "Cette note n’est plus disponible.",
      NOTE_PURGE_IN_PROGRESS: "La suppression définitive a commencé. Tu peux reprendre son nettoyage.",
      NOTE_IMAGE_OPERATION_IN_PROGRESS: "Termine le nettoyage des images avant de déplacer cette note.",
    };
    throw new Error(messages[code] || "Impossible de modifier l’état de la note. Réessaie après actualisation.");
  }
  return Array.isArray(data) ? data[0] : data;
}
