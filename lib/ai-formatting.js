export const AI_FORMAT_OUTPUT_LIMIT = 30000;
export const AI_FORMAT_CHUNK_THRESHOLD = 10000;
export const AI_FORMAT_CHUNK_LIMIT = 5000;
export const AI_FORMAT_CLIENT_TIMEOUT_MS = 100000;

const PRIVATE_IMAGE_REFERENCE_PATTERN = new RegExp(
  String.raw`!\[[^\]\r\n]*\]\(capsule-image\/[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}\)|capsule-image\/[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}`,
  "gi",
);
const ANY_PRIVATE_IMAGE_SOURCE_PATTERN = /capsule-image\//i;
const ANY_IMAGE_TOKEN_PATTERN = /\[\[CAPSULE_IMAGE_[a-f0-9]{32}_\d{4}\]\]/g;
const ANY_FACT_TOKEN_PATTERN = /\[\[CAPSULE_FACT_[a-f0-9]{32}_\d{4}\]\]/g;
const ANY_FACT_MARKER_PATTERN = /\[\[CAPSULE_FACT_/i;
const PROTECTED_FORMATTING_SOURCE_PATTERN = new RegExp(
  String.raw`\[\[CAPSULE_IMAGE_[a-f0-9]{32}_\d{4}\]\]|(?:https?:\/\/|www\.)[^\s<>()\[\]{}]+|\[(?: |x)\]|\d+(?:[.,]\d+)*`,
  "gi",
);
const ANY_PROTECTED_TOKEN_PATTERN = /\[\[CAPSULE_(?:IMAGE|FACT)_[a-f0-9]{32}_\d{4}\]\]/g;
const FORMATTING_BOUNDARY_PATTERN = /(?:\r?\n+|[.!?…](?:["'»”\)\]]*)[ \t]+)/g;
const NUMERIC_FACT_PATTERN = /\d+(?:[.,]\d+)*/g;
const URL_FACT_PATTERN = /(?:https?:\/\/|www\.)[^\s<>()\[\]{}]+/gi;
const TASK_MARKER_PATTERN = /\[(?: |x)\]/gi;

function createTokenNonce(content, kind) {
  if (typeof globalThis.crypto?.randomUUID !== "function") {
    throw new Error("Secure random UUID unavailable");
  }

  let nonce;
  do {
    nonce = globalThis.crypto.randomUUID().replaceAll("-", "").toLowerCase();
  } while (String(content || "").includes(`[[CAPSULE_${kind}_${nonce}_`));
  return nonce;
}

export function containsFormattableText(content) {
  return String(content || "")
    .replace(PRIVATE_IMAGE_REFERENCE_PATTERN, "")
    .trim()
    .length > 0;
}

export function containsMalformedPrivateImageReference(content) {
  const withoutValidReferences = String(content || "")
    .replace(PRIVATE_IMAGE_REFERENCE_PATTERN, "");
  return ANY_PRIVATE_IMAGE_SOURCE_PATTERN.test(withoutValidReferences);
}

function keepCutOutsideProtectedToken(source, start, cut) {
  const tokenPattern = new RegExp(ANY_PROTECTED_TOKEN_PATTERN.source, "g");
  tokenPattern.lastIndex = start;

  for (let match = tokenPattern.exec(source); match; match = tokenPattern.exec(source)) {
    const tokenStart = match.index;
    const tokenEnd = tokenStart + match[0].length;
    if (tokenStart >= cut) break;
    if (cut > tokenStart && cut < tokenEnd) {
      return tokenStart > start ? tokenStart : tokenEnd;
    }
  }
  return cut;
}

function findChunkCut(source, start, maxLength) {
  const hardEnd = Math.min(source.length, start + maxLength);
  const minimumUsefulEnd = start + Math.floor(maxLength * 0.55);
  let sentenceBoundary = -1;
  const boundaryPattern = new RegExp(FORMATTING_BOUNDARY_PATTERN.source, "g");
  boundaryPattern.lastIndex = start;

  for (let match = boundaryPattern.exec(source); match; match = boundaryPattern.exec(source)) {
    const boundaryEnd = match.index + match[0].length;
    if (boundaryEnd > hardEnd) break;
    if (boundaryEnd >= minimumUsefulEnd) sentenceBoundary = boundaryEnd;
  }

  let cut = sentenceBoundary;
  if (cut < 0) {
    for (let index = hardEnd; index >= minimumUsefulEnd; index -= 1) {
      if (/\s/.test(source[index - 1] || "")) {
        cut = index;
        break;
      }
    }
  }
  if (cut < 0) cut = hardEnd;
  return keepCutOutsideProtectedToken(source, start, cut);
}

export function splitAIFormattingContent(content, {
  maxLength = AI_FORMAT_CHUNK_LIMIT,
} = {}) {
  if (!Number.isInteger(maxLength) || maxLength < 1000) {
    throw new TypeError("Invalid AI formatting chunk length");
  }

  const source = String(content || "");
  if (!source) return [];
  if (source.length <= maxLength) return [source];

  const chunks = [];
  let start = 0;
  while (start < source.length) {
    const remaining = source.length - start;
    if (remaining <= maxLength) {
      const finalChunk = source.slice(start).trim();
      if (finalChunk) chunks.push(finalChunk);
      break;
    }

    const cut = findChunkCut(source, start, maxLength);
    const chunk = source.slice(start, cut).trim();
    if (chunk) chunks.push(chunk);
    start = cut;
    while (start < source.length && /\s/.test(source[start])) start += 1;
  }
  return chunks;
}

export function estimateAIFormattingSections(content) {
  const source = String(content || "");
  if (!source || source.length <= AI_FORMAT_CHUNK_THRESHOLD) return source ? 1 : 0;
  return splitAIFormattingContent(source).length;
}

function formattingFacts(value, pattern, normalize = (item) => item) {
  const withoutOrderedListMarkers = String(value || "")
    .replace(/^\s*\d+[.)]\s+/gm, "");
  return (withoutOrderedListMarkers.match(pattern) || []).map(normalize);
}

function sameOrderedValues(left, right) {
  return left.length === right.length
    && left.every((value, index) => value === right[index]);
}

export function validateAIFormattingFacts(source, proposal) {
  const original = String(source || "");
  const formatted = String(proposal || "");
  const maximumReasonableLength = Math.min(
    AI_FORMAT_OUTPUT_LIMIT,
    Math.ceil((original.length * 1.35) + 1000),
  );
  if (!formatted || formatted.length > maximumReasonableLength) {
    return { valid: false, code: "AI_FORMAT_RESPONSE_INVALID" };
  }

  const comparisons = [
    [
      formattingFacts(original, NUMERIC_FACT_PATTERN),
      formattingFacts(formatted, NUMERIC_FACT_PATTERN),
    ],
    [
      formattingFacts(original, URL_FACT_PATTERN, (url) => url.replace(/[.,;:!?]+$/, "")),
      formattingFacts(formatted, URL_FACT_PATTERN, (url) => url.replace(/[.,;:!?]+$/, "")),
    ],
    [
      formattingFacts(original, TASK_MARKER_PATTERN, (marker) => marker.toLowerCase()),
      formattingFacts(formatted, TASK_MARKER_PATTERN, (marker) => marker.toLowerCase()),
    ],
  ];

  return comparisons.every(([expected, actual]) => sameOrderedValues(expected, actual))
    ? { valid: true }
    : { valid: false, code: "AI_FORMAT_RESPONSE_INVALID" };
}

export function validateAIFormattingTokens(source, proposal) {
  const expectedTokens = String(source || "").match(ANY_PROTECTED_TOKEN_PATTERN) || [];
  const actualTokens = String(proposal || "").match(ANY_PROTECTED_TOKEN_PATTERN) || [];
  return sameOrderedValues(expectedTokens, actualTokens)
    ? { valid: true }
    : { valid: false, code: "AI_FORMAT_RESPONSE_INVALID" };
}

export function maskPrivateImageReferences(content, { nonce } = {}) {
  const source = String(content || "");
  const safeNonce = nonce || createTokenNonce(source, "IMAGE");
  if (!/^[a-f0-9]{32}$/.test(safeNonce)) {
    throw new TypeError("Invalid image token nonce");
  }

  const placeholders = [];
  const maskedContent = source.replace(PRIVATE_IMAGE_REFERENCE_PATTERN, (markdown) => {
    const token = `[[CAPSULE_IMAGE_${safeNonce}_${String(placeholders.length + 1).padStart(4, "0")}]]`;
    placeholders.push({ token, markdown });
    return token;
  });

  if (ANY_PRIVATE_IMAGE_SOURCE_PATTERN.test(maskedContent)) {
    throw new Error("Private image reference masking failed");
  }

  return { maskedContent, placeholders };
}

export function maskProtectedFormattingFacts(content, { nonce } = {}) {
  const source = String(content || "");
  const safeNonce = nonce || createTokenNonce(source, "FACT");
  if (!/^[a-f0-9]{32}$/.test(safeNonce)) {
    throw new TypeError("Invalid fact token nonce");
  }

  const placeholders = [];
  const maskedContent = source.replace(PROTECTED_FORMATTING_SOURCE_PATTERN, (fact) => {
    if (fact.startsWith("[[CAPSULE_IMAGE_")) return fact;
    const token = `[[CAPSULE_FACT_${safeNonce}_${String(placeholders.length + 1).padStart(4, "0")}]]`;
    placeholders.push({ token, fact });
    return token;
  });
  return { maskedContent, placeholders };
}

export function restoreProtectedFormattingFacts(value, placeholders) {
  const proposal = String(value || "").trim();
  const maskedExpansion = (placeholders || []).reduce(
    (sum, placeholder) => sum + Math.max(0, placeholder.token.length - placeholder.fact.length),
    0,
  );
  if (!proposal || proposal.length > AI_FORMAT_OUTPUT_LIMIT + maskedExpansion) {
    return { valid: false, code: "AI_FORMAT_RESPONSE_INVALID" };
  }

  const expectedTokens = (placeholders || []).map((placeholder) => placeholder.token);
  const actualTokens = proposal.match(ANY_FACT_TOKEN_PATTERN) || [];
  if (
    ANY_FACT_MARKER_PATTERN.test(proposal.replace(ANY_FACT_TOKEN_PATTERN, "")) ||
    actualTokens.length !== expectedTokens.length ||
    actualTokens.some((token, index) => token !== expectedTokens[index])
  ) {
    return { valid: false, code: "AI_FORMAT_RESPONSE_INVALID" };
  }

  let restored = proposal;
  for (const placeholder of placeholders || []) {
    restored = restored.replace(placeholder.token, placeholder.fact);
  }
  return restored.length <= AI_FORMAT_OUTPUT_LIMIT
    ? { valid: true, content: restored }
    : { valid: false, code: "AI_FORMAT_RESPONSE_INVALID" };
}

export function restorePrivateImageReferences(value, placeholders) {
  const proposal = String(value || "").trim();
  if (!proposal || proposal.length > AI_FORMAT_OUTPUT_LIMIT) {
    return { valid: false, code: "AI_FORMAT_RESPONSE_INVALID" };
  }
  if (ANY_PRIVATE_IMAGE_SOURCE_PATTERN.test(proposal)) {
    return { valid: false, code: "AI_FORMAT_RESPONSE_INVALID" };
  }

  const expectedTokens = (placeholders || []).map((placeholder) => placeholder.token);
  const actualTokens = proposal.match(ANY_IMAGE_TOKEN_PATTERN) || [];
  if (
    actualTokens.length !== expectedTokens.length ||
    actualTokens.some((token, index) => token !== expectedTokens[index])
  ) {
    return { valid: false, code: "AI_FORMAT_RESPONSE_INVALID" };
  }

  let restored = proposal;
  for (const placeholder of placeholders || []) {
    restored = restored.replace(placeholder.token, placeholder.markdown);
  }

  if (restored.length > AI_FORMAT_OUTPUT_LIMIT) {
    return { valid: false, code: "AI_FORMAT_RESPONSE_INVALID" };
  }
  return { valid: true, content: restored };
}
