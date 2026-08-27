const INLINE_FORMATS = {
  bold: { before: "**", after: "**", placeholder: "texte en gras" },
  italic: { before: "_", after: "_", placeholder: "texte en italique" },
  code: { before: "`", after: "`", placeholder: "code" },
};

function normalizeSelection(value, start, end) {
  const safeValue = value || "";
  const safeStart = Math.max(0, Math.min(safeValue.length, Number(start) || 0));
  const safeEnd = Math.max(safeStart, Math.min(safeValue.length, Number(end) || safeStart));
  return { value: safeValue, start: safeStart, end: safeEnd };
}

function wrapSelection(value, start, end, format) {
  const selected = value.slice(start, end) || format.placeholder;
  const replacement = `${format.before}${selected}${format.after}`;
  const nextValue = value.slice(0, start) + replacement + value.slice(end);
  const selectionStart = start + format.before.length;

  return {
    value: nextValue,
    selectionStart,
    selectionEnd: selectionStart + selected.length,
  };
}

function prefixLines(value, start, end, prefixFactory) {
  const lineStart = value.lastIndexOf("\n", Math.max(0, start - 1)) + 1;
  const nextBreak = value.indexOf("\n", end);
  const lineEnd = nextBreak === -1 ? value.length : nextBreak;
  const block = value.slice(lineStart, lineEnd);
  const lines = block.split("\n");
  const replacement = lines
    .map((line, index) => `${prefixFactory(index)}${line}`)
    .join("\n");

  return {
    value: value.slice(0, lineStart) + replacement + value.slice(lineEnd),
    selectionStart: lineStart,
    selectionEnd: lineStart + replacement.length,
  };
}

export function applyMarkdownFormat(value, start, end, type) {
  const selection = normalizeSelection(value, start, end);
  const inlineFormat = INLINE_FORMATS[type];

  if (inlineFormat) {
    return wrapSelection(
      selection.value,
      selection.start,
      selection.end,
      inlineFormat,
    );
  }

  if (type === "link") {
    const selected = selection.value.slice(selection.start, selection.end) || "texte du lien";
    const replacement = `[${selected}](https://)`;
    const nextValue =
      selection.value.slice(0, selection.start) +
      replacement +
      selection.value.slice(selection.end);
    const urlStart = selection.start + selected.length + 3;

    return {
      value: nextValue,
      selectionStart: urlStart,
      selectionEnd: urlStart + "https://".length,
    };
  }

  const prefixes = {
    heading: () => "## ",
    quote: () => "> ",
    bullet: () => "- ",
    numbered: (index) => `${index + 1}. `,
  };

  if (prefixes[type]) {
    return prefixLines(
      selection.value,
      selection.start,
      selection.end,
      prefixes[type],
    );
  }

  return {
    value: selection.value,
    selectionStart: selection.start,
    selectionEnd: selection.end,
  };
}
