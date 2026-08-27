import { describe, expect, it, vi } from "vitest";
import {
  buildPrintDocumentTitle,
  formatPrintDate,
  getMissingPrintImageIds,
  preparePrintableImages,
  PrintPreparationError,
} from "../lib/note-printing";

const IMAGE_A = "11111111-1111-4111-8111-111111111111";
const IMAGE_B = "22222222-2222-4222-8222-222222222222";

describe("préparation d'impression PRINT-001", () => {
  it("produit un titre de document sûr et borné", () => {
    const title = buildPrintDocumentTitle(
      'État <des> lieux : chambre / cuisine ? * "final"',
      "2026-08-27T12:00:00Z",
    );

    expect(title).toBe("Capsule - État des lieux chambre cuisine final - 2026-08-27");
    expect(title).not.toMatch(/[<>:"/\\|?*]/);
    expect(buildPrintDocumentTitle("", "date invalide")).toBe("Capsule - Note");
  });

  it("formate une date lisible et résiste à une valeur invalide", () => {
    expect(formatPrintDate("2026-08-27T12:00:00Z")).toContain("2026");
    expect(formatPrintDate("date invalide")).toBe("Date inconnue");
  });

  it("détecte seulement les références privées sans URL signée", () => {
    const content = [
      `![Entrée](capsule-image/${IMAGE_A})`,
      `![Cuisine](capsule-image/${IMAGE_B})`,
      `![Doublon](capsule-image/${IMAGE_B})`,
    ].join("\n");

    expect(getMissingPrintImageIds(content, { [IMAGE_A]: "https://signed.example/a" })).toEqual([IMAGE_B]);
    expect(getMissingPrintImageIds(content, {
      [IMAGE_A]: "https://signed.example/a",
      [IMAGE_B]: "https://signed.example/b",
    })).toEqual([]);
  });

  it("attend le décodage de toutes les images et expose la progression", async () => {
    const images = [
      { complete: true, naturalWidth: 1200, decode: vi.fn().mockResolvedValue() },
      { complete: true, naturalWidth: 800, decode: vi.fn().mockResolvedValue() },
    ];
    const root = { querySelectorAll: vi.fn().mockReturnValue(images) };
    const progress = [];

    await expect(preparePrintableImages(root, {
      onProgress: (value) => progress.push(value),
    })).resolves.toEqual({ total: 2 });
    expect(images.every((image) => image.decode.mock.calls.length === 1)).toBe(true);
    expect(progress[0]).toEqual({ completed: 0, total: 2, percent: 0 });
    expect(progress.at(-1)).toEqual({ completed: 2, total: 2, percent: 100 });
  });

  it("refuse une image déjà chargée mais invalide", async () => {
    const root = {
      querySelectorAll: () => [{ complete: true, naturalWidth: 0 }],
    };

    await expect(preparePrintableImages(root)).rejects.toMatchObject({
      code: "PRINT_IMAGE_UNAVAILABLE",
    });
  });

  it("interrompt une image qui ne termine jamais son chargement", async () => {
    const listeners = new Map();
    const image = {
      complete: false,
      naturalWidth: 0,
      addEventListener: vi.fn((name, callback) => listeners.set(name, callback)),
      removeEventListener: vi.fn((name) => listeners.delete(name)),
    };

    await expect(preparePrintableImages(
      { querySelectorAll: () => [image] },
      { timeoutMs: 5 },
    )).rejects.toMatchObject({ code: "PRINT_IMAGE_TIMEOUT" });
    expect(image.removeEventListener).toHaveBeenCalled();
  });

  it("permet à l'utilisateur d'annuler une préparation bloquée", async () => {
    const listeners = new Map();
    const image = {
      complete: false,
      naturalWidth: 0,
      addEventListener: vi.fn((name, callback) => listeners.set(name, callback)),
      removeEventListener: vi.fn((name) => listeners.delete(name)),
    };
    const controller = new AbortController();
    const preparation = preparePrintableImages(
      { querySelectorAll: () => [image] },
      { timeoutMs: 1000, signal: controller.signal },
    );

    controller.abort(new PrintPreparationError(
      "PRINT_PREPARATION_CANCELLED",
      "Préparation annulée.",
    ));

    await expect(preparation).rejects.toMatchObject({ code: "PRINT_PREPARATION_CANCELLED" });
    expect(image.removeEventListener).toHaveBeenCalled();
  });
});
