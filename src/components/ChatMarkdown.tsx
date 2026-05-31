"use client";

import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";

type Props = {
  text: string;
  variant?: "ai" | "user";
};

export function ChatMarkdown({ text, variant = "ai" }: Props) {
  const isUser = variant === "user";

  return (
    <ReactMarkdown
      remarkPlugins={[remarkGfm]}
      components={{
        p: ({ children }) => (
          <p style={{ margin: "0 0 0.65em", lineHeight: 1.7 }}>{children}</p>
        ),
        strong: ({ children }) => (
          <strong style={{ fontWeight: 700 }}>{children}</strong>
        ),
        em: ({ children }) => <em>{children}</em>,
        ul: ({ children }) => (
          <ul style={{ margin: "0.4em 0 0.65em", paddingLeft: "1.25em" }}>{children}</ul>
        ),
        ol: ({ children }) => (
          <ol style={{ margin: "0.4em 0 0.65em", paddingLeft: "1.25em" }}>{children}</ol>
        ),
        li: ({ children }) => <li style={{ marginBottom: "0.25em" }}>{children}</li>,
        hr: () => (
          <hr
            style={{
              border: "none",
              borderTop: isUser ? "1px solid rgba(255,255,255,0.25)" : "1px solid rgba(60,40,20,0.15)",
              margin: "0.75em 0",
            }}
          />
        ),
        h1: ({ children }) => (
          <h1 style={{ fontSize: "1.15em", fontWeight: 700, margin: "0 0 0.5em" }}>{children}</h1>
        ),
        h2: ({ children }) => (
          <h2 style={{ fontSize: "1.05em", fontWeight: 700, margin: "0 0 0.5em" }}>{children}</h2>
        ),
        h3: ({ children }) => (
          <h3 style={{ fontSize: "1em", fontWeight: 700, margin: "0 0 0.4em" }}>{children}</h3>
        ),
        code: ({ children }) => (
          <code
            style={{
              fontFamily: "ui-monospace, monospace",
              fontSize: "0.92em",
              background: isUser ? "rgba(255,255,255,0.12)" : "rgba(60,40,20,0.08)",
              padding: "0.1em 0.35em",
              borderRadius: 4,
            }}
          >
            {children}
          </code>
        ),
        a: ({ href, children }) => (
          <a href={href} target="_blank" rel="noopener noreferrer" style={{ color: isUser ? "#f5d4a8" : "#4a6741" }}>
            {children}
          </a>
        ),
      }}
    >
      {text}
    </ReactMarkdown>
  );
}
