"use client";

import { useId, useRef, useState } from "react";
import {
  createImageReference,
  extractImageIds,
  insertTextAtSelection,
  removeImageReference,
  sanitizeImageAlt,
  validateImageFile,
} from "@/lib/note-images";

export default function NoteContentEditor({
  value,
  onChange,
  pendingImages,
  onPendingImagesChange,
  existingImages = [],
  imageUrls = {},
  rows = 10,
  minHeight = "150px",
  placeholder = "Contenu (optionnel) — supporte le Markdown",
  disabled = false,
  imageDisabled = false,
}) {
  const inputId = useId();
  const textareaRef = useRef(null);
  const fileInputRef = useRef(null);
  const [validationError, setValidationError] = useState(null);
  const referencedIds = new Set(extractImageIds(value));
  const visiblePendingImages = pendingImages.filter((image) => referencedIds.has(image.id));
  const visibleExistingImages = existingImages.filter((image) => referencedIds.has(image.id));

  function queueFiles(fileList) {
    if (disabled || imageDisabled) return;
    const files = Array.from(fileList || []);
    if (files.length === 0) return;

    const accepted = [];
    const errors = [];

    for (const file of files) {
      const error = validateImageFile(file);
      if (error) {
        errors.push(`${file.name || "Image"} : ${error}`);
        continue;
      }

      const id = crypto.randomUUID();
      const alt = sanitizeImageAlt(file.name);
      accepted.push({
        id,
        alt,
        file,
        previewUrl: URL.createObjectURL(file),
      });
    }

    setValidationError(errors.length > 0 ? errors.join(" ") : null);
    if (accepted.length === 0) return;

    const textarea = textareaRef.current;
    const insertion = accepted
      .map((image) => createImageReference(image.id, image.alt))
      .join("\n\n");
    const result = insertTextAtSelection(
      value,
      insertion,
      textarea?.selectionStart,
      textarea?.selectionEnd
    );

    onPendingImagesChange([...pendingImages, ...accepted]);
    onChange(result.value);

    requestAnimationFrame(() => {
      textareaRef.current?.focus();
      textareaRef.current?.setSelectionRange(result.cursor, result.cursor);
    });
  }

  function handlePaste(event) {
    const imageFiles = Array.from(event.clipboardData?.items || [])
      .filter((item) => item.kind === "file" && item.type.startsWith("image/"))
      .map((item) => item.getAsFile())
      .filter(Boolean);

    if (imageFiles.length === 0) return;
    event.preventDefault();
    queueFiles(imageFiles);
  }

  function removePendingImage(image) {
    URL.revokeObjectURL(image.previewUrl);
    onPendingImagesChange(pendingImages.filter((item) => item.id !== image.id));
    onChange(removeImageReference(value, image.id));
  }

  function removeExistingImage(image) {
    onChange(removeImageReference(value, image.id));
  }

  return (
    <div className="note-content-editor">
      <textarea
        ref={textareaRef}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        onPaste={handlePaste}
        rows={rows}
        placeholder={placeholder}
        className="input-glass"
        disabled={disabled}
        style={{ resize: "vertical", minHeight }}
      />

      <div className="note-image-toolbar">
        <input
          ref={fileInputRef}
          id={inputId}
          type="file"
          accept="image/jpeg,image/png,image/webp"
          multiple
          disabled={disabled || imageDisabled}
          className="sr-only"
          onChange={(event) => {
            queueFiles(event.target.files);
            event.target.value = "";
          }}
        />
        <button
          type="button"
          className="btn-brutal ghost"
          disabled={disabled || imageDisabled}
          onClick={() => fileInputRef.current?.click()}
          style={{ fontSize: "0.65rem", padding: "0.3rem 0.55rem" }}
        >
          + Image
        </button>
        <span className="note-image-help">
          JPEG, PNG ou WebP — 5 Mio max. Tu peux aussi coller une image.
        </span>
      </div>

      {validationError && (
        <p className="note-image-error" role="alert">{validationError}</p>
      )}

      {(visiblePendingImages.length > 0 || visibleExistingImages.length > 0) && (
        <div className="note-image-preview-grid" aria-label="Images de la note">
          {visibleExistingImages.map((image) => (
            <div key={image.id} className="note-image-preview-card">
              {imageUrls[image.id] ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={imageUrls[image.id]} alt={image.original_name || "Image"} />
              ) : (
                <div className="note-image-preview-placeholder">Image privée</div>
              )}
              <button
                type="button"
                onClick={() => removeExistingImage(image)}
                disabled={disabled || imageDisabled}
                aria-label={`Retirer ${image.original_name || "l'image"}`}
              >
                &times;
              </button>
            </div>
          ))}
          {visiblePendingImages.map((image) => (
            <div key={image.id} className="note-image-preview-card pending">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={image.previewUrl} alt={image.alt} />
              <span>À envoyer</span>
              <button
                type="button"
                onClick={() => removePendingImage(image)}
                disabled={disabled || imageDisabled}
                aria-label={`Retirer ${image.alt}`}
              >
                &times;
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
