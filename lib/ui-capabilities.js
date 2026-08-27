export function prefersReducedMotion(browserWindow = globalThis.window) {
  return Boolean(
    browserWindow?.matchMedia?.("(prefers-reduced-motion: reduce)")?.matches,
  );
}

export function runViewTransition(
  update,
  browserDocument = globalThis.document,
  browserWindow = globalThis.window,
) {
  if (
    typeof update !== "function" ||
    !browserDocument?.startViewTransition ||
    prefersReducedMotion(browserWindow)
  ) {
    update?.();
    return null;
  }

  return browserDocument.startViewTransition(update);
}

export async function shareOrCopy(
  payload,
  browserNavigator = globalThis.navigator,
) {
  if (!payload?.url) throw new Error("Lien de partage manquant.");

  if (typeof browserNavigator?.share === "function") {
    try {
      await browserNavigator.share(payload);
      return "shared";
    } catch (error) {
      if (error?.name === "AbortError") return "cancelled";
      // Une implémentation partielle ne doit pas bloquer le repli presse-papiers.
    }
  }

  if (typeof browserNavigator?.clipboard?.writeText !== "function") {
    throw new Error("Le partage et le presse-papiers sont indisponibles.");
  }

  await browserNavigator.clipboard.writeText(payload.url);
  return "copied";
}
