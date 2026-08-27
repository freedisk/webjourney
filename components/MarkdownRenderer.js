"use client";

import { useState } from "react";
import ReactMarkdown from "react-markdown";
import ImageLightbox from "@/components/ImageLightbox";
import { extractImageReferences, getImageIdFromSource } from "@/lib/note-images";

// Composants custom pour le rendu Markdown, compatibles brutalism + glassmorphism
const markdownComponents = {
  h1: ({ children }) => (
    <h1 style={{ fontSize: "1.3em", fontWeight: 900, margin: "0.6em 0 0.3em", color: "var(--text-primary)" }}>
      {children}
    </h1>
  ),
  h2: ({ children }) => (
    <h2 style={{ fontSize: "1.15em", fontWeight: 800, margin: "0.5em 0 0.25em", color: "var(--text-primary)" }}>
      {children}
    </h2>
  ),
  h3: ({ children }) => (
    <h3 style={{ fontSize: "1.05em", fontWeight: 700, margin: "0.4em 0 0.2em", color: "var(--text-primary)" }}>
      {children}
    </h3>
  ),
  p: ({ children }) => (
    <p style={{ margin: "0.4em 0", lineHeight: 1.6, color: "var(--text-secondary)" }}>
      {children}
    </p>
  ),
  strong: ({ children }) => (
    <strong style={{ fontWeight: 800, color: "var(--text-primary)" }}>{children}</strong>
  ),
  em: ({ children }) => (
    <em style={{ fontStyle: "italic" }}>{children}</em>
  ),
  del: ({ children }) => (
    <del style={{ textDecoration: "line-through", color: "var(--text-muted)" }}>{children}</del>
  ),
  ul: ({ children }) => (
    <ul style={{ margin: "0.4em 0", paddingLeft: "1.5em", listStyleType: "disc" }}>{children}</ul>
  ),
  ol: ({ children }) => (
    <ol style={{ margin: "0.4em 0", paddingLeft: "1.5em", listStyleType: "decimal" }}>{children}</ol>
  ),
  li: ({ children }) => (
    <li style={{ margin: "0.15em 0", lineHeight: 1.5, color: "var(--text-secondary)" }}>{children}</li>
  ),
  blockquote: ({ children }) => (
    <blockquote
      style={{
        borderLeft: "3px solid var(--accent)",
        paddingLeft: "0.75em",
        margin: "0.5em 0",
        fontStyle: "italic",
        color: "var(--text-muted)",
      }}
    >
      {children}
    </blockquote>
  ),
  code: ({ inline, children }) => {
    if (inline) {
      return (
        <code
          style={{
            background: "var(--input-bg)",
            border: "1px solid var(--input-border)",
            borderRadius: "2px",
            padding: "0.1em 0.35em",
            fontSize: "0.85em",
            fontFamily: "var(--font-mono), monospace",
            color: "var(--accent)",
          }}
        >
          {children}
        </code>
      );
    }
    return (
      <code
        style={{
          fontFamily: "var(--font-mono), monospace",
          fontSize: "0.85em",
        }}
      >
        {children}
      </code>
    );
  },
  pre: ({ children }) => (
    <pre
      style={{
        background: "var(--bg-secondary)",
        border: "2px solid var(--input-border)",
        borderRadius: "2px",
        padding: "0.75em",
        margin: "0.5em 0",
        overflow: "auto",
        fontFamily: "var(--font-mono), monospace",
        fontSize: "0.8em",
        lineHeight: 1.5,
        color: "var(--text-primary)",
      }}
    >
      {children}
    </pre>
  ),
  hr: () => (
    <hr
      style={{
        border: "none",
        borderTop: "2px solid var(--panel-border)",
        margin: "0.75em 0",
      }}
    />
  ),
  a: ({ href, children }) => (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      style={{
        color: "var(--accent)",
        textDecoration: "underline",
        fontWeight: 700,
      }}
    >
      {children}
    </a>
  ),
};

export default function MarkdownRenderer({ content, imageUrls = {}, compact = false, interactive = true }) {
  const [activeImageId, setActiveImageId] = useState(null);
  if (!content) return null;

  const galleryImages = (interactive ? extractImageReferences(content) : [])
    .map((reference) => ({
      id: reference.id,
      src: imageUrls[reference.id],
      alt: reference.alt || "Image de la note",
    }))
    .filter((image) => Boolean(image.src));
  const activeIndex = galleryImages.findIndex((image) => image.id === activeImageId);

  const components = {
    ...markdownComponents,
    img: ({ src, alt }) => {
      const imageId = getImageIdFromSource(src);

      if (imageId) {
        const signedUrl = imageUrls[imageId];
        if (!signedUrl) {
          return (
            <span
              role="status"
              data-print-image-missing="true"
              style={{
                display: "block",
                margin: "0.6em 0",
                padding: "0.75em",
                border: "1.5px dashed var(--input-border)",
                borderRadius: "3px",
                color: "var(--text-muted)",
                fontSize: "0.8em",
                textAlign: "center",
              }}
            >
              Image privée indisponible
            </span>
          );
        }

        if (!interactive) {
          return (
            <span className="markdown-note-image print-note-image" role="group" aria-label={alt || "Image de la note"}>
              {/* L'URL signée reste éphémère et n'est jamais stockée dans le Markdown. */}
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={signedUrl}
                alt={alt || "Image de la note"}
                loading="eager"
                decoding="async"
                data-print-image="true"
              />
              {alt && <span className="markdown-note-image-caption">{alt}</span>}
            </span>
          );
        }

        return (
          <span className="markdown-note-image">
            <button
              type="button"
              className={`markdown-note-image-button${compact ? " compact" : ""}`}
              onClick={(event) => {
                event.stopPropagation();
                setActiveImageId(imageId);
              }}
              aria-label={`Agrandir ${alt || "l'image"}`}
            >
              {/* L'URL signée est dynamique : next/image ne connaît pas ses dimensions. */}
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={signedUrl}
                alt={alt || "Image de la note"}
                loading="lazy"
                decoding="async"
              />
              <span className="markdown-note-image-zoom" aria-hidden="true">Agrandir</span>
            </button>
            {alt && !compact && (
              <span className="markdown-note-image-caption">
                {alt}
              </span>
            )}
          </span>
        );
      }

      // Les images HTTPS déjà saisies manuellement restent compatibles.
      if (!interactive) {
        return (
          <span className="markdown-note-image print-note-image" role="group" aria-label={alt || "Image"}>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={src}
              alt={alt || "Image"}
              loading="eager"
              decoding="async"
              data-print-image="true"
            />
            {alt && <span className="markdown-note-image-caption">{alt}</span>}
          </span>
        );
      }

      return (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={src}
          alt={alt || "Image"}
          loading="lazy"
          decoding="async"
          style={{ maxWidth: "100%", height: "auto" }}
        />
      );
    },
  };

  return (
    <div className="markdown-renderer">
      <ReactMarkdown components={components}>{content}</ReactMarkdown>
      {interactive && (
        <ImageLightbox
          images={galleryImages}
          activeIndex={activeIndex}
          onChange={(index) => setActiveImageId(galleryImages[index]?.id || null)}
          onClose={() => setActiveImageId(null)}
        />
      )}
    </div>
  );
}
