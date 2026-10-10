export function normalizeNoteSearch(value) {
  return String(value || "").normalize("NFD").replace(/[\u0300-\u036f]/g, "")
    .replace(/[\u2018\u2019]/g, "'").toLowerCase();
}

// Les sources privées d'images ne doivent entrer ni dans l'index ni dans un extrait.
export function noteSearchText(value) {
  return String(value || "")
    .replace(/!\[[^\]]*\]\([^)]*\)/g, " ")
    .replace(/https?:\/\/[^\s<>]*\/storage\/v1\/[^\s<>]*/gi, " ")
    .replace(/capsule-image\/[^\s)\]<>]+/gi, " ")
    .replace(/^\s{0,3}#{1,6}\s+/gm, "")
    .replace(/(\*\*|__|\u0060)(.*?)\1/gs, "$2")
    .replace(/\s+/g, " ").trim();
}

export function createNoteSearchIndex(notes, noteTags = {}, tags = []) {
  const tagNames = new Map(tags.map((tag) => [tag.id, noteSearchText(tag.nom)]));
  return notes.map((note, order) => {
    const title = noteSearchText(note.titre) || "Note";
    const text = noteSearchText(note.contenu);
    const labels = (noteTags[note.id] || []).map((id) => tagNames.get(id)).filter(Boolean);
    return {
      id: note.id, title, text, tags: labels, order,
      date: Date.parse(note.created_at) || 0,
      normalizedTitle: normalizeNoteSearch(title),
      normalizedText: normalizeNoteSearch(text),
      searchable: normalizeNoteSearch([title, text, ...labels].join(" ")),
    };
  });
}

export function noteSearchExcerpt(text, query, limit = 160) {
  const clean = noteSearchText(text);
  const needle = normalizeNoteSearch(query.trim());
  const offsets = [];
  let normalized = "";
  for (let offset = 0; offset < clean.length; offset += 1) {
    const part = normalizeNoteSearch(clean[offset]);
    normalized += part;
    for (let index = 0; index < part.length; index += 1) offsets.push(offset);
  }
  const match = needle ? normalized.indexOf(needle) : -1;
  let start = match < 0 ? 0 : Math.max(0, offsets[match] - 48);
  if (start > 0) {
    const nextSpace = clean.indexOf(" ", start);
    if (nextSpace > start && nextSpace < start + 20) start = nextSpace + 1;
  }
  const room = Math.max(0, limit - 2);
  const end = Math.min(clean.length, start + room);
  return (start ? "…" : "") + clean.slice(start, end).trim() + (end < clean.length ? "…" : "");
}

export function searchNoteIndex(index, query, { excerptCount = Infinity } = {}) {
  const needle = normalizeNoteSearch(query.trim());
  const matches = needle ? index.filter((entry) => entry.searchable.includes(needle)) : [...index];
  return matches.sort((a, b) => {
    const rankA = needle && a.normalizedTitle.includes(needle) ? 0 : 1;
    const rankB = needle && b.normalizedTitle.includes(needle) ? 0 : 1;
    return rankA - rankB || b.date - a.date || a.order - b.order;
  }).map((entry, position) => ({
    ...entry,
    excerpt: position < excerptCount ? noteSearchExcerpt(entry.text, query) : "",
    tag: entry.tags.find((tag) => needle && normalizeNoteSearch(tag).includes(needle)) || entry.tags[0] || "",
  }));
}
