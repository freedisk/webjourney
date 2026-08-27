"use client";

import { useEffect, useId, useRef, useState } from "react";
import ImageLightbox from "@/components/ImageLightbox";
import MarkdownRenderer from "@/components/MarkdownRenderer";
import Icon from "@/components/ui/Icon";
import { formatImageBytes, optimizeImageFile } from "@/lib/image-compression";
import { applyMarkdownFormat } from "@/lib/markdown-editor";
import {
  createImageReference,
  extractImageIds,
  insertTextAtSelection,
  removeImageReference,
  sanitizeImageAlt,
  validateImageInputFile,
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
  uploadProgress = null,
  onProcessingChange,
  onOpenHelp,
}) {
  const inputId = useId();
  const textareaRef = useRef(null);
  const fileInputRef = useRef(null);
  const dragDepthRef = useRef(0);
  const mountedRef = useRef(true);
  const preparingRef = useRef(false);
  const ownedPreviewUrlsRef = useRef(new Set());
  const [validationError, setValidationError] = useState(null);
  const [isDragging, setIsDragging] = useState(false);
  const [isPreparing, setIsPreparing] = useState(false);
  const [preparationProgress, setPreparationProgress] = useState(null);
  const [activePreviewId, setActivePreviewId] = useState(null);
  const [editorMode, setEditorMode] = useState("write");
  const referencedIds = new Set(extractImageIds(value));
  const visiblePendingImages = pendingImages.filter((image) => referencedIds.has(image.id));
  const visibleExistingImages = existingImages.filter((image) => referencedIds.has(image.id));

  useEffect(() => {
    mountedRef.current = true;
    const ownedPreviewUrls = ownedPreviewUrlsRef.current;
    return () => {
      mountedRef.current = false;
      if (preparingRef.current) onProcessingChange?.(false);
      preparingRef.current = false;
      for (const previewUrl of ownedPreviewUrls) {
        URL.revokeObjectURL(previewUrl);
      }
      ownedPreviewUrls.clear();
    };
  }, [onProcessingChange]);

  useEffect(() => {
    const activePreviewUrls = new Set(
      pendingImages.map((image) => image.previewUrl).filter(Boolean)
    );
    for (const previewUrl of ownedPreviewUrlsRef.current) {
      if (!activePreviewUrls.has(previewUrl)) {
        URL.revokeObjectURL(previewUrl);
        ownedPreviewUrlsRef.current.delete(previewUrl);
      }
    }
  }, [pendingImages]);

  async function queueFiles(fileList) {
    if (disabled || imageDisabled || preparingRef.current) return;
    const files = Array.from(fileList || []);
    if (files.length === 0) return;

    const validFiles = [];
    const errors = [];
    for (const file of files) {
      const error = validateImageInputFile(file);
      if (error) {
        errors.push(`${file.name || "Image"} : ${error}`);
      } else {
        validFiles.push(file);
      }
    }

    setValidationError(errors.length > 0 ? errors.join(" ") : null);
    if (validFiles.length === 0) return;

    preparingRef.current = true;
    setIsPreparing(true);
    onProcessingChange?.(true);
    const accepted = [];

    try {
      for (let index = 0; index < validFiles.length; index += 1) {
        const file = validFiles[index];
        const displayName = file.name || `Image ${index + 1}`;

        try {
          const optimized = await optimizeImageFile(file, {
            onProgress: (progress) => {
              if (!mountedRef.current) return;
              const overallPercent = Math.round(
                ((index + progress.percent / 100) / validFiles.length) * 100
              );
              setPreparationProgress({
                label: `Optimisation ${index + 1}/${validFiles.length} — ${displayName}`,
                percent: overallPercent,
              });
            },
          });
          const id = crypto.randomUUID();
          const alt = sanitizeImageAlt(displayName);
          const previewUrl = URL.createObjectURL(optimized.file);
          ownedPreviewUrlsRef.current.add(previewUrl);
          accepted.push({
            id,
            alt,
            file: optimized.file,
            originalName: displayName,
            previewUrl,
            optimized: optimized.optimized,
            originalSize: optimized.originalSize,
            savingsPercent: optimized.savingsPercent,
            width: optimized.width,
            height: optimized.height,
          });
        } catch (error) {
          const message = error instanceof Error
            ? error.message
            : "Impossible de préparer cette image.";
          errors.push(`${displayName} : ${message}`);
        }
      }

      if (!mountedRef.current) {
        for (const image of accepted) {
          URL.revokeObjectURL(image.previewUrl);
          ownedPreviewUrlsRef.current.delete(image.previewUrl);
        }
        return;
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
    } finally {
      preparingRef.current = false;
      if (mountedRef.current) {
        setIsPreparing(false);
        setPreparationProgress(null);
        onProcessingChange?.(false);
      }
    }
  }

  function handlePaste(event) {
    const imageFiles = Array.from(event.clipboardData?.items || [])
      .filter((item) => item.kind === "file" && item.type.startsWith("image/"))
      .map((item) => item.getAsFile())
      .filter(Boolean);

    if (imageFiles.length === 0) return;
    event.preventDefault();
    void queueFiles(imageFiles);
  }

  function handleDragEnter(event) {
    if (!Array.from(event.dataTransfer?.types || []).includes("Files")) return;
    event.preventDefault();
    dragDepthRef.current += 1;
    if (!disabled && !imageDisabled && !isPreparing) setIsDragging(true);
  }

  function handleDragOver(event) {
    if (!Array.from(event.dataTransfer?.types || []).includes("Files")) return;
    event.preventDefault();
    event.dataTransfer.dropEffect = "copy";
  }

  function handleDragLeave(event) {
    if (!Array.from(event.dataTransfer?.types || []).includes("Files")) return;
    event.preventDefault();
    dragDepthRef.current = Math.max(0, dragDepthRef.current - 1);
    if (dragDepthRef.current === 0) setIsDragging(false);
  }

  function handleDrop(event) {
    if (!Array.from(event.dataTransfer?.types || []).includes("Files")) return;
    event.preventDefault();
    dragDepthRef.current = 0;
    setIsDragging(false);
    void queueFiles(event.dataTransfer.files);
  }

  function removePendingImage(image) {
    URL.revokeObjectURL(image.previewUrl);
    ownedPreviewUrlsRef.current.delete(image.previewUrl);
    onPendingImagesChange(pendingImages.filter((item) => item.id !== image.id));
    onChange(removeImageReference(value, image.id));
    if (activePreviewId === image.id) setActivePreviewId(null);
  }

  function removeExistingImage(image) {
    onChange(removeImageReference(value, image.id));
    if (activePreviewId === image.id) setActivePreviewId(null);
  }

  function applyFormat(type) {
    const textarea = textareaRef.current;
    const result = applyMarkdownFormat(
      value,
      textarea?.selectionStart,
      textarea?.selectionEnd,
      type,
    );
    onChange(result.value);
    requestAnimationFrame(() => {
      textareaRef.current?.focus();
      textareaRef.current?.setSelectionRange(
        result.selectionStart,
        result.selectionEnd,
      );
    });
  }

  const galleryImages = [
    ...visibleExistingImages
      .filter((image) => Boolean(imageUrls[image.id]))
      .map((image) => ({
        id: image.id,
        src: imageUrls[image.id],
        alt: image.original_name || "Image",
        meta: formatImageBytes(image.size_bytes),
      })),
    ...visiblePendingImages.map((image) => ({
      id: image.id,
      src: image.previewUrl,
      alt: image.alt,
      meta: `${formatImageBytes(image.file.size)}${image.optimized ? ` — ${image.savingsPercent}% économisés` : ""}`,
    })),
  ];
  const activePreviewIndex = galleryImages.findIndex((image) => image.id === activePreviewId);
  const currentProgress = preparationProgress || uploadProgress;
  const previewImageUrls = {
    ...imageUrls,
    ...visiblePendingImages.reduce((map, image) => {
      map[image.id] = image.previewUrl;
      return map;
    }, {}),
  };
  const markdownFormats = [
    { type: "bold", label: "Gras", text: "B" },
    { type: "italic", label: "Italique", text: "I" },
    { type: "heading", label: "Titre", text: "H2" },
    { type: "bullet", label: "Liste à puces", text: "•" },
    { type: "numbered", label: "Liste numérotée", text: "1." },
    { type: "quote", label: "Citation", text: "❝" },
    { type: "link", label: "Lien", text: "↗" },
    { type: "code", label: "Code", text: "<>" },
  ];

  return (
    <div
      className={`note-content-editor${isDragging ? " is-dragging" : ""}`}
      onDragEnter={handleDragEnter}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
      aria-busy={isPreparing || Boolean(uploadProgress)}
    >
      {isDragging && (
        <div className="note-image-drop-overlay" aria-hidden="true">
          Dépose les images ici
        </div>
      )}

      <div className="markdown-editor-shell">
        <div className="markdown-editor-topbar">
          {editorMode !== "preview" ? (
            <div className="markdown-format-toolbar" role="toolbar" aria-label="Mise en forme Markdown">
              {markdownFormats.map((format) => (
                <button
                  key={format.type}
                  type="button"
                  onClick={() => applyFormat(format.type)}
                  disabled={disabled || isPreparing}
                  title={format.label}
                  aria-label={format.label}
                >
                  {format.text}
                </button>
              ))}
              {onOpenHelp && (
                <button
                  type="button"
                  onClick={() => onOpenHelp("notes")}
                  disabled={disabled || isPreparing}
                  title="Aide Markdown"
                  aria-label="Ouvrir l’aide Markdown"
                >
                  <Icon name="help" size={15} />
                </button>
              )}
            </div>
          ) : <span />}
          <div className="markdown-view-switcher" role="group" aria-label="Mode de l'éditeur">
            {[
              ["write", "Écrire"],
              ["split", "Double"],
              ["preview", "Aperçu"],
            ].map(([mode, label]) => (
              <button
                key={mode}
                type="button"
                className={editorMode === mode ? "is-active" : ""}
                aria-pressed={editorMode === mode}
                onClick={() => setEditorMode(mode)}
              >
                {label}
              </button>
            ))}
          </div>
        </div>

        <div className={`markdown-editor-workspace${editorMode === "split" ? " is-split" : ""}`}>
          {editorMode !== "preview" && (
            <div className="markdown-editor-pane">
              <textarea
                ref={textareaRef}
                value={value}
                onChange={(event) => onChange(event.target.value)}
                onPaste={handlePaste}
                rows={rows}
                placeholder={placeholder}
                aria-label="Contenu Markdown"
                className="input-glass"
                disabled={disabled || isPreparing}
                style={{ resize: "vertical", minHeight }}
              />
            </div>
          )}
          {editorMode !== "write" && (
            <div className="markdown-preview-pane" style={{ minHeight }} aria-label="Aperçu Markdown">
              {value.trim() ? (
                <MarkdownRenderer content={value} imageUrls={previewImageUrls} />
              ) : (
                <div className="markdown-preview-empty">L&apos;aperçu apparaîtra ici.</div>
              )}
            </div>
          )}
        </div>
      </div>

      <div className="note-image-toolbar">
        <input
          ref={fileInputRef}
          id={inputId}
          type="file"
          accept="image/jpeg,image/png,image/webp"
          multiple
          disabled={disabled || imageDisabled || isPreparing}
          className="sr-only"
          onChange={(event) => {
            void queueFiles(event.target.files);
            event.target.value = "";
          }}
        />
        <button
          type="button"
          className="btn-brutal ghost"
          disabled={disabled || imageDisabled || isPreparing}
          onClick={() => fileInputRef.current?.click()}
          style={{ fontSize: "0.65rem", padding: "0.3rem 0.55rem" }}
        >
          {isPreparing ? "Optimisation…" : "+ Image"}
        </button>
        <span className="note-image-help">
          Sélectionne, colle ou glisse des JPEG, PNG ou WebP — 20 Mio source max,
          optimisés à 5 Mio avant l&apos;envoi.
          {onOpenHelp && (
            <button type="button" className="help-inline-link" onClick={() => onOpenHelp("images")}>
              Guide images
            </button>
          )}
        </span>
      </div>

      {currentProgress && (
        <div className="note-image-progress" role="status" aria-live="polite">
          <div>
            <span>{currentProgress.label}</span>
            <strong>{currentProgress.percent}%</strong>
          </div>
          <progress value={currentProgress.percent} max="100">
            {currentProgress.percent}%
          </progress>
        </div>
      )}

      {validationError && (
        <p className="note-image-error" role="alert">{validationError}</p>
      )}

      {(visiblePendingImages.length > 0 || visibleExistingImages.length > 0) && (
        <div className="note-image-preview-grid" aria-label="Images de la note">
          {visibleExistingImages.map((image, index) => {
            const signedUrl = imageUrls[image.id];
            return (
              <div key={image.id} className="note-image-preview-card">
                {signedUrl ? (
                  <button
                    type="button"
                    className="note-image-preview-open"
                    onClick={() => setActivePreviewId(image.id)}
                    aria-label={`Agrandir ${image.original_name || `l'image ${index + 1}`}`}
                  >
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={signedUrl} alt={image.original_name || "Image"} />
                  </button>
                ) : (
                  <div className="note-image-preview-placeholder">Image privée</div>
                )}
                <span className="note-image-status">En ligne</span>
                <div className="note-image-preview-meta">
                  <strong>{image.original_name || `Image ${index + 1}`}</strong>
                  <span>{formatImageBytes(image.size_bytes)}</span>
                </div>
                <button
                  type="button"
                  className="note-image-remove-button"
                  onClick={() => removeExistingImage(image)}
                  disabled={disabled || imageDisabled || isPreparing}
                  aria-label={`Retirer ${image.original_name || "l'image"}`}
                >
                  &times;
                </button>
              </div>
            );
          })}
          {visiblePendingImages.map((image, index) => (
            <div key={image.id} className="note-image-preview-card pending">
              <button
                type="button"
                className="note-image-preview-open"
                onClick={() => setActivePreviewId(image.id)}
                aria-label={`Agrandir ${image.alt}`}
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={image.previewUrl} alt={image.alt} />
              </button>
              <span className="note-image-status">
                {image.optimized ? `Optimisée −${image.savingsPercent}%` : "Prête"}
              </span>
              <div className="note-image-preview-meta">
                <strong>{image.originalName || `Image ${index + 1}`}</strong>
                <span>{formatImageBytes(image.file.size)} · {image.width}×{image.height}</span>
              </div>
              <button
                type="button"
                className="note-image-remove-button"
                onClick={() => removePendingImage(image)}
                disabled={disabled || imageDisabled || isPreparing}
                aria-label={`Retirer ${image.alt}`}
              >
                &times;
              </button>
            </div>
          ))}
        </div>
      )}

      <ImageLightbox
        images={galleryImages}
        activeIndex={activePreviewIndex}
        onChange={(index) => setActivePreviewId(galleryImages[index]?.id || null)}
        onClose={() => setActivePreviewId(null)}
      />
    </div>
  );
}
