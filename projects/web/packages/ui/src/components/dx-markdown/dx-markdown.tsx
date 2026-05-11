import { useEffect, useMemo, useState, type ReactNode } from "react";
import ReactMarkdown, { type Components } from "react-markdown";
import remarkBreaks from "remark-breaks";
import remarkGfm from "remark-gfm";
import * as s from "./dx-markdown.css";
import { DARK_THEME, LIGHT_THEME, loadHighlighter, resolveLanguage } from "./shiki-highlighter";

export type DxMarkdownProps = {
  children: string;
  className?: string;
};

export function DxMarkdown({ children, className }: DxMarkdownProps) {
  const components = useMemo<Components>(
    () => ({
      code: ({ className: codeClassName, children: codeChildren, ...props }) => {
        const value = childrenToString(codeChildren);
        const langMatch = /language-(\w+)/.exec(codeClassName ?? "");
        if (!langMatch) {
          return (
            <code className={s.codeInline} {...props}>
              {value}
            </code>
          );
        }
        return <CodeBlock lang={langMatch[1] ?? ""}>{value}</CodeBlock>;
      },
      pre: ({ children: preChildren }) => <>{preChildren}</>,
    }),
    [],
  );

  return (
    <div className={[s.root, className].filter(Boolean).join(" ")}>
      <ReactMarkdown remarkPlugins={[remarkGfm, remarkBreaks]} components={components}>
        {children}
      </ReactMarkdown>
    </div>
  );
}

function CodeBlock({ lang, children }: { lang: string; children: string }) {
  const resolved = resolveLanguage(lang);
  const [html, setHtml] = useState<string | undefined>(undefined);

  useEffect(() => {
    if (resolved === "text") {
      return;
    }
    let cancelled = false;
    loadHighlighter()
      .then((highlighter) => {
        if (cancelled) return;
        const rendered = highlighter.codeToHtml(children, {
          lang: resolved,
          themes: { light: LIGHT_THEME, dark: DARK_THEME },
          defaultColor: "light",
        });
        setHtml(rendered);
        return;
      })
      .catch(() => {
        // Highlight failure leaves the plain fallback in place.
      });
    return () => {
      cancelled = true;
    };
  }, [children, resolved]);

  if (html) {
    return <div className={s.codeBlock} dangerouslySetInnerHTML={{ __html: html }} />;
  }

  return (
    <pre className={s.codeBlock}>
      <code>{children}</code>
    </pre>
  );
}

function childrenToString(value: ReactNode): string {
  if (value === null || value === undefined || typeof value === "boolean") {
    return "";
  }
  if (typeof value === "string" || typeof value === "number") {
    return String(value);
  }
  if (Array.isArray(value)) {
    return value.map(childrenToString).join("");
  }
  return "";
}
