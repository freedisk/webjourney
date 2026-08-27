import { extractImageReferences } from "./note-images.js";

export const PRINT_IMAGE_TIMEOUT_MS = 15000;

export class PrintPreparationError extends Error {
  constructor(code, message) {
    super(message);
    this.name = "PrintPreparationError";
    this.code = code;
  }
}

export function formatPrintDate(value, locale = "fr-FR") {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "Date inconnue";

  return new Intl.DateTimeFormat(locale, {
    dateStyle: "long",
    timeStyle: "short",
  }).format(date);
}

export function buildPrintDocumentTitle(title, createdAt) {
  const safeTitle = String(title || "Note")
    .replace(/[<>:"/\\|?*\u0000-\u001f]+/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, 90) || "Note";
  const date = new Date(createdAt);
  const datePart = Number.isNaN(date.getTime()) ? "" : date.toISOString().slice(0, 10);

  return ["Capsule", safeTitle, datePart].filter(Boolean).join(" - ");
}

export function getMissingPrintImageIds(content, imageUrls = {}) {
  return extractImageReferences(content)
    .map((reference) => reference.id)
    .filter((imageId) => !imageUrls[imageId]);
}

function notifyProgress(onProgress, completed, total) {
  if (typeof onProgress !== "function") return;
  try {
    onProgress({
      completed,
      total,
      percent: total === 0 ? 100 : Math.round((completed / total) * 100),
    });
  } catch {
    // Le suivi visuel ne doit pas interrompre la préparation du document.
  }
}

function isDecoded(image) {
  return image?.complete === true && Number(image.naturalWidth) > 0;
}

function waitForImageLoad(image, signal) {
  if (isDecoded(image)) return Promise.resolve();
  if (image?.complete) {
    return Promise.reject(new PrintPreparationError(
      "PRINT_IMAGE_UNAVAILABLE",
      "Une image du document est indisponible.",
    ));
  }

  return new Promise((resolve, reject) => {
    function cleanup() {
      image?.removeEventListener?.("load", handleLoad);
      image?.removeEventListener?.("error", handleError);
      signal?.removeEventListener?.("abort", handleAbort);
    }

    function handleLoad() {
      cleanup();
      resolve();
    }

    function handleError() {
      cleanup();
      reject(new PrintPreparationError(
        "PRINT_IMAGE_UNAVAILABLE",
        "Une image du document n'a pas pu être chargée.",
      ));
    }

    function handleAbort() {
      cleanup();
      reject(signal?.reason instanceof Error
        ? signal.reason
        : new PrintPreparationError(
          "PRINT_IMAGE_TIMEOUT",
          "La préparation des images a pris trop de temps. Réessaie après avoir vérifié la connexion.",
        ));
    }

    image?.addEventListener?.("load", handleLoad, { once: true });
    image?.addEventListener?.("error", handleError, { once: true });
    signal?.addEventListener?.("abort", handleAbort, { once: true });

    // L'état peut avoir changé entre le premier contrôle et l'abonnement.
    if (signal?.aborted) handleAbort();
    else if (isDecoded(image)) handleLoad();
  });
}

async function decodeImage(image, signal) {
  await waitForImageLoad(image, signal);
  if (typeof image?.decode === "function") {
    try {
      await image.decode();
    } catch {
      if (!isDecoded(image)) {
        throw new PrintPreparationError(
          "PRINT_IMAGE_UNAVAILABLE",
          "Une image du document n'a pas pu être décodée.",
        );
      }
    }
  }

  if (!isDecoded(image)) {
    throw new PrintPreparationError(
      "PRINT_IMAGE_UNAVAILABLE",
      "Une image du document est indisponible.",
    );
  }
}

export async function preparePrintableImages(root, {
  timeoutMs = PRINT_IMAGE_TIMEOUT_MS,
  onProgress,
  signal,
} = {}) {
  if (!root?.querySelectorAll) {
    throw new PrintPreparationError(
      "PRINT_DOCUMENT_UNAVAILABLE",
      "L'aperçu du document n'est pas prêt.",
    );
  }

  const images = [...root.querySelectorAll('[data-print-image="true"]')];
  const controller = new AbortController();
  let completed = 0;
  const timeout = setTimeout(() => controller.abort(new PrintPreparationError(
    "PRINT_IMAGE_TIMEOUT",
    "La préparation des images a pris trop de temps. Réessaie après avoir vérifié la connexion.",
  )), Math.max(1, timeoutMs));
  const handleExternalAbort = () => controller.abort(
    signal?.reason instanceof Error
      ? signal.reason
      : new PrintPreparationError("PRINT_PREPARATION_CANCELLED", "Préparation annulée."),
  );
  signal?.addEventListener?.("abort", handleExternalAbort, { once: true });
  if (signal?.aborted) handleExternalAbort();
  notifyProgress(onProgress, completed, images.length);

  try {
    await Promise.all(images.map(async (image) => {
      await decodeImage(image, controller.signal);
      completed += 1;
      notifyProgress(onProgress, completed, images.length);
    }));
    return { total: images.length };
  } catch (error) {
    controller.abort();
    throw error;
  } finally {
    clearTimeout(timeout);
    signal?.removeEventListener?.("abort", handleExternalAbort);
  }
}
