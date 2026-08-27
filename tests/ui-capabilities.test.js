import { describe, expect, it, vi } from "vitest";
import {
  prefersReducedMotion,
  runViewTransition,
  shareOrCopy,
} from "../lib/ui-capabilities";

describe("capacités UI progressives", () => {
  it("désactive les transitions lorsque le mouvement réduit est demandé", () => {
    const update = vi.fn();
    const startViewTransition = vi.fn();
    const browserWindow = { matchMedia: () => ({ matches: true }) };

    expect(prefersReducedMotion(browserWindow)).toBe(true);
    expect(runViewTransition(update, { startViewTransition }, browserWindow)).toBeNull();
    expect(update).toHaveBeenCalledOnce();
    expect(startViewTransition).not.toHaveBeenCalled();
  });

  it("utilise View Transition lorsqu'elle est disponible", () => {
    const update = vi.fn();
    const transition = { finished: Promise.resolve() };
    const startViewTransition = vi.fn((callback) => {
      callback();
      return transition;
    });

    expect(runViewTransition(
      update,
      { startViewTransition },
      { matchMedia: () => ({ matches: false }) },
    )).toBe(transition);
    expect(update).toHaveBeenCalledOnce();
  });

  it("préfère le partage système et conserve le repli presse-papiers", async () => {
    const share = vi.fn().mockResolvedValue(undefined);
    const writeText = vi.fn().mockResolvedValue(undefined);
    const payload = { title: "Capsule", url: "https://example.test/share" };

    await expect(shareOrCopy(payload, { share, clipboard: { writeText } })).resolves.toBe("shared");
    expect(writeText).not.toHaveBeenCalled();

    await expect(shareOrCopy(payload, { clipboard: { writeText } })).resolves.toBe("copied");
    expect(writeText).toHaveBeenCalledWith(payload.url);
  });

  it("ne transforme pas une annulation utilisateur en erreur", async () => {
    const error = new Error("cancelled");
    error.name = "AbortError";
    await expect(shareOrCopy(
      { url: "https://example.test/share" },
      { share: vi.fn().mockRejectedValue(error) },
    )).resolves.toBe("cancelled");
  });
});
