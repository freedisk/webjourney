import {
  MAX_IMAGE_SIZE_BYTES,
  validateImageFile,
  validateImageInputFile,
} from "./note-images.js";

export const DEFAULT_MAX_IMAGE_DIMENSION = 2048;
export const IMAGE_COMPRESSION_THRESHOLD_BYTES = 750 * 1024;
export const MAX_IMAGE_PIXEL_COUNT = 40_000_000;

const COMPRESSION_ATTEMPTS = Object.freeze([
  { quality: 0.84, scale: 1 },
  { quality: 0.74, scale: 1 },
  { quality: 0.64, scale: 1 },
  { quality: 0.62, scale: 0.85 },
  { quality: 0.58, scale: 0.7 },
]);

export function calculateContainedDimensions(width, height, maxDimension = DEFAULT_MAX_IMAGE_DIMENSION) {
  if (![width, height, maxDimension].every((value) => Number.isFinite(value) && value > 0)) {
    throw new Error("Dimensions d'image invalides.");
  }

  const scale = Math.min(1, maxDimension / Math.max(width, height));
  return {
    width: Math.max(1, Math.round(width * scale)),
    height: Math.max(1, Math.round(height * scale)),
  };
}

export function formatImageBytes(bytes) {
  if (!Number.isFinite(bytes) || bytes < 0) return "—";
  if (bytes < 1024) return `${Math.round(bytes)} o`;
  if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} Kio`;
  return `${(bytes / (1024 * 1024)).toLocaleString("fr-FR", {
    minimumFractionDigits: 1,
    maximumFractionDigits: 1,
  })} Mio`;
}

export function getCompressionSavingsPercent(originalSize, optimizedSize) {
  if (!Number.isFinite(originalSize) || originalSize <= 0 || !Number.isFinite(optimizedSize)) {
    return 0;
  }
  return Math.max(0, Math.round((1 - optimizedSize / originalSize) * 100));
}

export function buildOptimizedImageName(fileName) {
  const baseName = String(fileName || "image")
    .replace(/\.[^.]+$/, "")
    .trim() || "image";
  return `${baseName}.webp`;
}

async function decodeImageFile(file) {
  if (typeof createImageBitmap === "function") {
    let bitmap;
    try {
      bitmap = await createImageBitmap(file, { imageOrientation: "from-image" });
    } catch {
      bitmap = await createImageBitmap(file);
    }
    return {
      source: bitmap,
      width: bitmap.width,
      height: bitmap.height,
      cleanup: () => bitmap.close?.(),
    };
  }

  if (typeof Image === "undefined" || typeof URL === "undefined") {
    throw new Error("La compression d'image n'est pas disponible dans ce navigateur.");
  }

  const objectUrl = URL.createObjectURL(file);
  const image = new Image();
  image.decoding = "async";

  try {
    await new Promise((resolve, reject) => {
      image.onload = resolve;
      image.onerror = () => reject(new Error("Le fichier image ne peut pas être décodé."));
      image.src = objectUrl;
    });
    return {
      source: image,
      width: image.naturalWidth,
      height: image.naturalHeight,
      cleanup: () => URL.revokeObjectURL(objectUrl),
    };
  } catch (error) {
    URL.revokeObjectURL(objectUrl);
    throw error;
  }
}

async function encodeImageAsWebp({ source, width, height, quality }) {
  if (typeof document === "undefined") {
    throw new Error("La compression d'image nécessite un navigateur.");
  }

  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const context = canvas.getContext("2d", { alpha: true });
  if (!context) throw new Error("Impossible de préparer l'image pour la compression.");

  context.imageSmoothingEnabled = true;
  context.imageSmoothingQuality = "high";
  context.drawImage(source, 0, 0, width, height);

  const blob = await new Promise((resolve) => {
    canvas.toBlob(resolve, "image/webp", quality);
  });
  canvas.width = 1;
  canvas.height = 1;

  if (!blob) throw new Error("Ce navigateur ne peut pas encoder l'image en WebP.");
  return blob;
}

function emitProgress(onProgress, progress) {
  if (typeof onProgress === "function") onProgress(progress);
}

function buildOriginalResult(file, decoded) {
  return {
    file,
    optimized: false,
    originalSize: file.size,
    optimizedSize: file.size,
    savingsPercent: 0,
    originalWidth: decoded.width,
    originalHeight: decoded.height,
    width: decoded.width,
    height: decoded.height,
  };
}

export async function optimizeImageFile(file, options = {}) {
  const inputError = validateImageInputFile(file);
  if (inputError) throw new Error(inputError);

  const {
    maxDimension = DEFAULT_MAX_IMAGE_DIMENSION,
    maxOutputBytes = MAX_IMAGE_SIZE_BYTES,
    compressionThresholdBytes = IMAGE_COMPRESSION_THRESHOLD_BYTES,
    decodeImage = decodeImageFile,
    encodeImage = encodeImageAsWebp,
    createFile = (parts, name, fileOptions) => new File(parts, name, fileOptions),
    onProgress,
  } = options;

  emitProgress(onProgress, { phase: "decoding", percent: 8 });
  const decoded = await decodeImage(file);

  try {
    if (!Number.isFinite(decoded.width) || !Number.isFinite(decoded.height)
      || decoded.width <= 0 || decoded.height <= 0) {
      throw new Error("Dimensions d'image invalides.");
    }
    if (decoded.width * decoded.height > MAX_IMAGE_PIXEL_COUNT) {
      throw new Error("L'image contient trop de pixels pour être préparée en sécurité.");
    }

    const contained = calculateContainedDimensions(decoded.width, decoded.height, maxDimension);
    const needsResize = contained.width !== decoded.width || contained.height !== decoded.height;
    const needsCompression = needsResize
      || file.size > compressionThresholdBytes
      || file.size > maxOutputBytes;

    if (!needsCompression && !validateImageFile(file)) {
      emitProgress(onProgress, { phase: "complete", percent: 100 });
      return buildOriginalResult(file, decoded);
    }

    let selected = null;
    let smallest = null;

    for (let index = 0; index < COMPRESSION_ATTEMPTS.length; index += 1) {
      const attempt = COMPRESSION_ATTEMPTS[index];
      const width = Math.max(1, Math.round(contained.width * attempt.scale));
      const height = Math.max(1, Math.round(contained.height * attempt.scale));
      emitProgress(onProgress, {
        phase: "encoding",
        percent: 20 + Math.round((index / COMPRESSION_ATTEMPTS.length) * 70),
      });

      const blob = await encodeImage({
        source: decoded.source,
        width,
        height,
        quality: attempt.quality,
      });
      const candidate = { blob, width, height };
      if (!smallest || blob.size < smallest.blob.size) smallest = candidate;

      if (blob.size <= maxOutputBytes) {
        if (needsResize || file.size > maxOutputBytes || blob.size < file.size) {
          selected = candidate;
        }
        break;
      }
    }

    if (!selected) {
      if (!needsResize && !validateImageFile(file)) {
        emitProgress(onProgress, { phase: "complete", percent: 100 });
        return buildOriginalResult(file, decoded);
      }
      if (smallest?.blob.size <= maxOutputBytes) {
        selected = smallest;
      } else {
        throw new Error("L'image reste trop lourde après compression (5 Mio maximum).");
      }
    }

    const optimizedFile = createFile(
      [selected.blob],
      buildOptimizedImageName(file.name),
      { type: "image/webp", lastModified: file.lastModified || Date.now() }
    );
    const outputError = validateImageFile(optimizedFile);
    if (outputError) throw new Error(outputError);

    emitProgress(onProgress, { phase: "complete", percent: 100 });
    return {
      file: optimizedFile,
      optimized: true,
      originalSize: file.size,
      optimizedSize: optimizedFile.size,
      savingsPercent: getCompressionSavingsPercent(file.size, optimizedFile.size),
      originalWidth: decoded.width,
      originalHeight: decoded.height,
      width: selected.width,
      height: selected.height,
    };
  } finally {
    decoded.cleanup?.();
  }
}
