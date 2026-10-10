export function noteDraftSnapshot({ title = "", content = "", color = null, pendingImages = [] } = {}) {
  return {
    title: String(title), content: String(content), color: color || null,
    imageIds: pendingImages.map((image) => image.id).sort(),
  };
}

export function isNoteDraftChanged(draft, baseline) {
  const current = noteDraftSnapshot(draft);
  const original = baseline || noteDraftSnapshot();
  return current.title !== original.title || current.content !== original.content
    || current.color !== original.color
    || current.imageIds.length !== original.imageIds.length
    || current.imageIds.some((id, index) => id !== original.imageIds[index]);
}

export function noteDraftStatus({ changed, saving, preparing, failed, creating }) {
  if (preparing) return "Préparation des images…";
  if (saving) return "Enregistrement…";
  if (failed) return "Enregistrement impossible — Réessayer";
  if (changed) return "Modifications non enregistrées";
  return creating ? "Nouvelle note" : "Enregistré";
}
