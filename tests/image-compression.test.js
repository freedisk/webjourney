import { describe, expect, it, vi } from "vitest";
import {
  buildOptimizedImageName,
  calculateContainedDimensions,
  formatImageBytes,
  getCompressionSavingsPercent,
  optimizeImageFile,
} from "../lib/image-compression.js";

const MIB = 1024 * 1024;

function createFileFactory() {
  return (parts, name, options) => ({
    name,
    type: options.type,
    lastModified: options.lastModified,
    size: parts[0].size,
  });
}

describe("outils de compression", () => {
  it("conserve le ratio dans une boîte de 2 048 px sans agrandir", () => {
    expect(calculateContainedDimensions(4000, 3000)).toEqual({ width: 2048, height: 1536 });
    expect(calculateContainedDimensions(800, 600)).toEqual({ width: 800, height: 600 });
  });

  it("formate le poids, le nom et l'économie obtenue", () => {
    expect(buildOptimizedImageName("capture.final.png")).toBe("capture.final.webp");
    expect(formatImageBytes(1536)).toContain("Kio");
    expect(getCompressionSavingsPercent(10 * MIB, 4 * MIB)).toBe(60);
  });
});

describe("pipeline de compression", () => {
  it("redimensionne une photo lourde et produit un WebP conforme", async () => {
    const cleanup = vi.fn();
    const encodeImage = vi.fn().mockResolvedValue({ size: 4 * MIB });
    const progress = vi.fn();
    const input = {
      name: "photo.jpg",
      type: "image/jpeg",
      size: 8 * MIB,
      lastModified: 123,
    };

    const result = await optimizeImageFile(input, {
      decodeImage: vi.fn().mockResolvedValue({
        source: { kind: "bitmap" },
        width: 4000,
        height: 3000,
        cleanup,
      }),
      encodeImage,
      createFile: createFileFactory(),
      onProgress: progress,
    });

    expect(result).toMatchObject({
      optimized: true,
      width: 2048,
      height: 1536,
      optimizedSize: 4 * MIB,
      savingsPercent: 50,
    });
    expect(result.file).toMatchObject({ name: "photo.webp", type: "image/webp" });
    expect(encodeImage).toHaveBeenCalledWith(expect.objectContaining({
      width: 2048,
      height: 1536,
      quality: 0.84,
    }));
    expect(progress).toHaveBeenLastCalledWith({ phase: "complete", percent: 100 });
    expect(cleanup).toHaveBeenCalledTimes(1);
  });

  it("réessaie avec une qualité inférieure tant que le résultat dépasse 5 Mio", async () => {
    const encodeImage = vi.fn()
      .mockResolvedValueOnce({ size: 6 * MIB })
      .mockResolvedValueOnce({ size: 4.5 * MIB });

    const result = await optimizeImageFile({
      name: "scan.png",
      type: "image/png",
      size: 7 * MIB,
      lastModified: 1,
    }, {
      decodeImage: vi.fn().mockResolvedValue({ source: {}, width: 1600, height: 1200 }),
      encodeImage,
      createFile: createFileFactory(),
    });

    expect(encodeImage).toHaveBeenCalledTimes(2);
    expect(result.optimizedSize).toBe(4.5 * MIB);
  });

  it("garde un petit fichier conforme sans réencodage destructif", async () => {
    const input = { name: "icone.png", type: "image/png", size: 120_000, lastModified: 1 };
    const encodeImage = vi.fn();

    const result = await optimizeImageFile(input, {
      decodeImage: vi.fn().mockResolvedValue({ source: {}, width: 512, height: 512 }),
      encodeImage,
      createFile: createFileFactory(),
    });

    expect(result.file).toBe(input);
    expect(result.optimized).toBe(false);
    expect(encodeImage).not.toHaveBeenCalled();
  });

  it("refuse une image dont le nombre de pixels menace la mémoire du navigateur", async () => {
    await expect(optimizeImageFile({
      name: "geante.jpg",
      type: "image/jpeg",
      size: 2 * MIB,
    }, {
      decodeImage: vi.fn().mockResolvedValue({ source: {}, width: 10000, height: 5000 }),
      createFile: createFileFactory(),
    })).rejects.toThrow("trop de pixels");
  });
});
