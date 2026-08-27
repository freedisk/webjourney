export const AI_FORMAT_OUTPUT_LIMIT = 30000;

const PRIVATE_IMAGE_REFERENCE_PATTERN = new RegExp(
  String.raw`!\[[^\]\r\n]*\]\(capsule-image\/[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}\)|capsule-image\/[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}`,
  "gi",
);
const ANY_PRIVATE_IMAGE_SOURCE_PATTERN = /capsule-image\//i;
const ANY_IMAGE_TOKEN_PATTERN = /\[\[CAPSULE_IMAGE_[a-f0-9]{32}_\d{4}\]\]/g;

function createTokenNonce(content) {
  if (typeof globalThis.crypto?.randomUUID !== "function") {
    throw new Error("Secure random UUID unavailable");
  }

  let nonce;
  do {
    nonce = globalThis.crypto.randomUUID().replaceAll("-", "").toLowerCase();
  } while (String(content || "").includes(`[[CAPSULE_IMAGE_${nonce}_`));
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

export function maskPrivateImageReferences(content, { nonce } = {}) {
  const source = String(content || "");
  const safeNonce = nonce || createTokenNonce(source);
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
