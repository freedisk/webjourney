"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import IconButton from "@/components/ui/IconButton";

function ToastItem({ toast, onDismiss }) {
  useEffect(() => {
    if (toast.duration === 0) return undefined;
    const timer = setTimeout(() => onDismiss(toast.id), toast.duration || 5000);
    return () => clearTimeout(timer);
  }, [onDismiss, toast.duration, toast.id]);

  return (
    <article
      className={`toast toast-${toast.tone || "info"}`}
      role={toast.tone === "error" ? "alert" : "status"}
    >
      <div className="toast-copy">
        {toast.title && <strong>{toast.title}</strong>}
        <span>{toast.message}</span>
      </div>
      {toast.actionLabel && toast.onAction && (
        <button
          type="button"
          className="toast-action"
          onClick={async () => {
            onDismiss(toast.id);
            await toast.onAction();
          }}
        >
          {toast.actionLabel}
        </button>
      )}
      <IconButton
        label="Masquer la notification"
        icon="close"
        size="small"
        onClick={() => onDismiss(toast.id)}
      />
    </article>
  );
}

export function useToasts() {
  const [toasts, setToasts] = useState([]);
  const sequenceRef = useRef(0);

  const dismissToast = useCallback((id) => {
    setToasts((current) => current.filter((toast) => toast.id !== id));
  }, []);

  const pushToast = useCallback((message, options = {}) => {
    sequenceRef.current += 1;
    const id = `toast-${Date.now()}-${sequenceRef.current}`;
    setToasts((current) => [
      ...current.slice(-3),
      { id, message, duration: 5000, tone: "info", ...options },
    ]);
    return id;
  }, []);

  return { toasts, pushToast, dismissToast };
}

export default function ToastViewport({ toasts, onDismiss }) {
  if (toasts.length === 0) return null;

  return (
    <div className="toast-viewport" aria-live="polite" aria-relevant="additions">
      {toasts.map((toast) => (
        <ToastItem key={toast.id} toast={toast} onDismiss={onDismiss} />
      ))}
    </div>
  );
}
