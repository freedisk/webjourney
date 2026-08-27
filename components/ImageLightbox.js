"use client";

import { useEffect, useRef } from "react";
import { createPortal } from "react-dom";
import { getModalFocusable, isolateBodyContent, isWithinModalFocus } from "@/lib/modal-isolation";

export default function ImageLightbox({ images, activeIndex, onChange, onClose }) {
  const panelRef = useRef(null);
  const rootRef = useRef(null);
  const closeButtonRef = useRef(null);
  const pointerStartX = useRef(null);
  const previousFocusRef = useRef(null);
  const activeImage = activeIndex >= 0 ? images[activeIndex] : null;

  function goTo(nextIndex) {
    if (images.length === 0) return;
    const normalized = (nextIndex + images.length) % images.length;
    onChange(normalized);
  }

  useEffect(() => {
    if (!activeImage) return undefined;

    previousFocusRef.current = document.activeElement;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const restoreIsolation = isolateBodyContent(rootRef.current);
    closeButtonRef.current?.focus();

    function handleKeyDown(event) {
      if (event.key === "Escape") onClose();
      if (event.key === "ArrowLeft" && images.length > 1) goTo(activeIndex - 1);
      if (event.key === "ArrowRight" && images.length > 1) goTo(activeIndex + 1);
      if (event.key === "Tab") {
        if (!isWithinModalFocus(panelRef.current, document.activeElement)) return;
        const focusable = getModalFocusable(panelRef.current);
        if (!focusable?.length) return;
        const first = focusable[0];
        const last = focusable[focusable.length - 1];
        if (event.shiftKey && document.activeElement === first) {
          event.preventDefault();
          last.focus();
        } else if (!event.shiftKey && document.activeElement === last) {
          event.preventDefault();
          first.focus();
        }
      }
    }

    document.addEventListener("keydown", handleKeyDown);
    return () => {
      restoreIsolation();
      document.body.style.overflow = previousOverflow;
      document.removeEventListener("keydown", handleKeyDown);
      if (document.contains(previousFocusRef.current)) {
        previousFocusRef.current?.focus({ preventScroll: true });
      }
    };
  // Les callbacks du parent pilotent volontairement la visionneuse contrôlée.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeImage?.id, activeIndex, images.length]);

  if (!activeImage || typeof document === "undefined") return null;

  return createPortal(
    <div
      ref={rootRef}
      className="image-lightbox"
      role="dialog"
      aria-modal="true"
      aria-label="Visionneuse d'images"
      onClick={(event) => {
        if (event.target === event.currentTarget) onClose();
      }}
      onPointerDown={(event) => {
        pointerStartX.current = event.clientX;
      }}
      onPointerUp={(event) => {
        if (pointerStartX.current === null) return;
        const delta = event.clientX - pointerStartX.current;
        pointerStartX.current = null;
        if (images.length < 2) return;
        if (Math.abs(delta) < 55) return;
        goTo(activeIndex + (delta < 0 ? 1 : -1));
      }}
      onPointerCancel={() => {
        pointerStartX.current = null;
      }}
    >
      <div ref={panelRef} className="image-lightbox-panel">
        <div className="image-lightbox-header">
          <span aria-live="polite">
            Image {activeIndex + 1} sur {images.length}
          </span>
          <div className="image-lightbox-actions">
            <a
              href={activeImage.src}
              target="_blank"
              rel="noopener noreferrer"
              className="image-lightbox-link"
            >
              Ouvrir l&apos;original
            </a>
            <button
              ref={closeButtonRef}
              type="button"
              className="image-lightbox-close"
              onClick={onClose}
              aria-label="Fermer la visionneuse"
            >
              &times;
            </button>
          </div>
        </div>

        <div className="image-lightbox-stage">
          {images.length > 1 && (
            <button
              type="button"
              className="image-lightbox-nav previous"
              onClick={() => goTo(activeIndex - 1)}
              aria-label="Image précédente"
            >
              &#8249;
            </button>
          )}
          {/* Les URL sont des blob locaux ou des URL Supabase signées et temporaires. */}
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={activeImage.src} alt={activeImage.alt || "Image de la note"} />
          {images.length > 1 && (
            <button
              type="button"
              className="image-lightbox-nav next"
              onClick={() => goTo(activeIndex + 1)}
              aria-label="Image suivante"
            >
              &#8250;
            </button>
          )}
        </div>

        {(activeImage.alt || activeImage.meta) && (
          <div className="image-lightbox-caption">
            {activeImage.alt && <strong>{activeImage.alt}</strong>}
            {activeImage.meta && <span>{activeImage.meta}</span>}
          </div>
        )}
      </div>
    </div>,
    document.body
  );
}
