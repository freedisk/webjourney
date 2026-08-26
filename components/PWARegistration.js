"use client";

import { useEffect } from "react";

export default function PWARegistration() {
  useEffect(() => {
    // Un service worker en développement gênerait le rechargement à chaud.
    if (process.env.NODE_ENV !== "production" || !("serviceWorker" in navigator)) {
      return undefined;
    }

    let cancelled = false;

    async function registerServiceWorker() {
      try {
        const registration = await navigator.serviceWorker.register("/sw.js", {
          scope: "/",
          updateViaCache: "none",
        });

        if (!cancelled) {
          await registration.update();
          await navigator.serviceWorker.ready;
          document.documentElement.dataset.pwaServiceWorker = "ready";
        }
      } catch {
        // L'application en ligne reste utilisable si le navigateur refuse la PWA.
      }
    }

    if (document.readyState === "complete") {
      registerServiceWorker();
    } else {
      window.addEventListener("load", registerServiceWorker, { once: true });
    }

    return () => {
      cancelled = true;
      window.removeEventListener("load", registerServiceWorker);
    };
  }, []);

  return null;
}
