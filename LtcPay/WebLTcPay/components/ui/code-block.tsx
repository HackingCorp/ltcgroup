"use client";

import { useState } from "react";

interface CodeBlockProps {
  children: string;
  lang?: string;
}

export function CodeBlock({ children, lang = "json" }: CodeBlockProps) {
  const [copied, setCopied] = useState(false);

  const handleCopy = () => {
    navigator.clipboard.writeText(children);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <pre
      style={{
        background: "#0d1117",
        color: "#c9d1d9",
        fontFamily: "var(--mono)",
        fontSize: 12,
        lineHeight: 1.6,
        padding: 16,
        borderRadius: 8,
        overflow: "auto",
        margin: 0,
      }}
    >
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          marginBottom: 10,
          color: "#6e7681",
          fontSize: 10,
          textTransform: "uppercase",
          letterSpacing: "0.06em",
        }}
      >
        <span>{lang}</span>
        <button
          onClick={handleCopy}
          style={{
            background: "none",
            border: "none",
            color: "#6e7681",
            cursor: "pointer",
            fontFamily: "var(--mono)",
            fontSize: 10,
            textTransform: "uppercase",
            letterSpacing: "0.06em",
          }}
        >
          {copied ? "copied!" : "copy"}
        </button>
      </div>
      <code>{children}</code>
    </pre>
  );
}
