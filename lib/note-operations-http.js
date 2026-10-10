const MESSAGES = {
  AUTH_REQUIRED: "Connecte-toi pour effectuer cette action.",
  AUTH_INVALID: "Ta session a expiré. Reconnecte-toi avant de réessayer.",
  NOTE_REQUEST_INVALID: "La demande est invalide.",
  IMAGE_REQUEST_INVALID: "La demande d’image est invalide.",
  NOTE_NOT_FOUND: "Cette note n’est plus disponible.",
  NOTE_NOT_TRASH: "Place la note dans la corbeille avant de la supprimer définitivement.",
  NOTE_READ_ONLY: "Restaure cette note avant de modifier ses images.",
  NOTE_VERSION_CONFLICT: "L’état de cette note a changé ailleurs. Actualise avant de réessayer.",
  NOTE_IMAGE_OPERATION_IN_PROGRESS: "Termine le nettoyage des images avant de déplacer cette note.",
  IMAGE_STILL_REFERENCED: "Cette image est encore utilisée dans la note enregistrée.",
  IMAGE_CLEANUP_INCOMPLETE: "Le nettoyage des images n’est pas terminé. Tu peux le réessayer.",
  NOTE_SERVICE_UNAVAILABLE: "Cette action est momentanément indisponible. Réessaie après actualisation.",
};

export function noteOperationJson(data, status = 200) {
  return Response.json(data, { status, headers: { "Cache-Control": "no-store, max-age=0", Pragma: "no-cache", "X-Content-Type-Options": "nosniff" } });
}
export function noteOperationError(error) {
  const code = Object.hasOwn(MESSAGES, error?.code) ? error.code : "NOTE_SERVICE_UNAVAILABLE";
  return noteOperationJson({ error: MESSAGES[code], code }, Object.hasOwn(MESSAGES, error?.code) ? error.status || 503 : 503);
}
export async function readNoteOperationBody(request) {
  try {
    const payload = await request.json();
    if (!payload || typeof payload !== "object" || Array.isArray(payload)) throw new Error();
    return payload;
  } catch {
    const error = new Error("NOTE_REQUEST_INVALID"); error.code = "NOTE_REQUEST_INVALID"; error.status = 400;
    throw error;
  }
}
