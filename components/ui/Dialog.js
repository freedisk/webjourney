"use client";

import { useEffect, useId, useRef } from "react";
import { createPortal } from "react-dom";
import IconButton from "@/components/ui/IconButton";
import {
  getModalFocusable,
  isolateBodyContent,
  isWithinModalFocus,
} from "@/lib/modal-isolation";

export default function Dialog({
  open,
  onClose,
  title,
  children,
  footer,
  className = "",
  overlayClassName = "",
  panelStyle,
  initialFocusRef,
  closeOnBackdrop = true,
  showClose = true,
  description,
}) {
  const titleId = useId();
  const descriptionId = useId();
  const panelRef = useRef(null);
  const overlayRef = useRef(null);
  const closeButtonRef = useRef(null);
  const previousFocusRef = useRef(null);
  const onCloseRef = useRef(onClose);

  useEffect(() => {
    onCloseRef.current = onClose;
  }, [onClose]);

  useEffect(() => {
    if (!open) return undefined;

    previousFocusRef.current = document.activeElement;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const restoreIsolation = isolateBodyContent(overlayRef.current);

    requestAnimationFrame(() => {
      const target =
        initialFocusRef?.current ||
        closeButtonRef.current ||
        getModalFocusable(panelRef.current)[0] ||
        panelRef.current;
      target?.focus({ preventScroll: true });
    });

    function handleKeyDown(event) {
      if (!isWithinModalFocus(panelRef.current, document.activeElement)) return;

      if (event.key === "Escape") {
        event.preventDefault();
        onCloseRef.current?.();
        return;
      }

      if (event.key !== "Tab") return;
      const focusable = getModalFocusable(panelRef.current);
      if (focusable.length === 0) {
        event.preventDefault();
        panelRef.current.focus();
        return;
      }

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

    document.addEventListener("keydown", handleKeyDown);
    return () => {
      restoreIsolation();
      document.body.style.overflow = previousOverflow;
      document.removeEventListener("keydown", handleKeyDown);
      if (document.contains(previousFocusRef.current)) {
        previousFocusRef.current?.focus({ preventScroll: true });
      }
    };
  }, [initialFocusRef, open]);

  if (!open || typeof document === "undefined") return null;

  return createPortal(
    <div
      ref={overlayRef}
      className={`modal-overlay ${overlayClassName}`.trim()}
      onMouseDown={(event) => {
        if (closeOnBackdrop && event.target === event.currentTarget) onClose?.();
      }}
    >
      <section
        ref={panelRef}
        className={`modal-content ${className}`.trim()}
        style={panelStyle}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        aria-describedby={description ? descriptionId : undefined}
        tabIndex={-1}
      >
        <header className="modal-header">
          <div>
            <h2 id={titleId} className="modal-title">{title}</h2>
            {description && (
              <p id={descriptionId} className="modal-description">{description}</p>
            )}
          </div>
          {showClose && (
            <IconButton
              ref={closeButtonRef}
              label="Fermer"
              icon="close"
              size="small"
              onClick={onClose}
            />
          )}
        </header>
        <div className="modal-body">{children}</div>
        {footer && <footer className="modal-footer">{footer}</footer>}
      </section>
    </div>,
    document.body,
  );
}
