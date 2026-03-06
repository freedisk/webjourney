import ReactMarkdown from "react-markdown";

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

export default function MarkdownRenderer({ content }) {
  if (!content) return null;

  return (
    <div style={{ overflow: "hidden" }}>
      <ReactMarkdown components={markdownComponents}>{content}</ReactMarkdown>
    </div>
  );
}
