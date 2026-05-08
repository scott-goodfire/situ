import type { ReactNode } from "react";
import ReactMarkdown, { type Components } from "react-markdown";
import remarkGfm from "remark-gfm";
import * as s from "../styles.css";

type MarkdownTextVariant = "block" | "inline";

const inlineAllowedElements = [
  "a",
  "br",
  "code",
  "del",
  "em",
  "p",
  "strong",
] satisfies string[];
const inlineAllowedElementsWithoutLinks = inlineAllowedElements.filter(
  (element) => element !== "a",
);

export function MarkdownText({
  value,
  variant = "block",
  className,
  dataTone,
  allowLinks = true,
}: {
  value: ReactNode;
  variant?: MarkdownTextVariant;
  className?: string;
  dataTone?: string;
  allowLinks?: boolean;
}) {
  if (value == null || value === false) return null;
  if (typeof value !== "string") return <>{value}</>;

  const source = value.trim();
  if (!source) return null;

  const rootClassName = [variant === "inline" ? s.markdownInline : s.markdownBlock, className]
    .filter(Boolean)
    .join(" ");
  const markdown = (
    <ReactMarkdown
      allowedElements={
        variant === "inline"
          ? allowLinks
            ? inlineAllowedElements
            : inlineAllowedElementsWithoutLinks
          : undefined
      }
      components={markdownComponents({ variant })}
      remarkPlugins={[remarkGfm]}
      skipHtml
      unwrapDisallowed
    >
      {source}
    </ReactMarkdown>
  );

  if (variant === "inline") {
    return (
      <span className={rootClassName} data-tone={dataTone}>
        {markdown}
      </span>
    );
  }
  return (
    <div className={rootClassName} data-tone={dataTone}>
      {markdown}
    </div>
  );
}

function markdownComponents({ variant }: { variant: MarkdownTextVariant }): Components {
  return {
    a: ({ children, href, title }) => (
      <a href={href} rel="noreferrer" target="_blank" title={title}>
        {children}
      </a>
    ),
    p: ({ children }) => (variant === "inline" ? <>{children}</> : <p>{children}</p>),
  };
}
