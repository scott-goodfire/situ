import type { Highlighter } from "shiki";

const LANGS = [
  "bash",
  "css",
  "diff",
  "html",
  "js",
  "json",
  "jsx",
  "md",
  "python",
  "shell",
  "sql",
  "ts",
  "tsx",
] as const;

const LIGHT_THEME = "github-light";
const DARK_THEME = "github-dark";

export type DxMarkdownLanguage = (typeof LANGS)[number];

let highlighterPromise: Promise<Highlighter> | undefined;

export function loadHighlighter(): Promise<Highlighter> {
  if (!highlighterPromise) {
    highlighterPromise = (async () => {
      const { createHighlighter } = await import("shiki");
      return createHighlighter({
        themes: [LIGHT_THEME, DARK_THEME],
        langs: [...LANGS],
      });
    })();
  }
  return highlighterPromise;
}

export function resolveLanguage(raw: string | undefined): DxMarkdownLanguage | "text" {
  if (!raw) {
    return "text";
  }
  const normalized = raw.trim().toLowerCase();
  if ((LANGS as readonly string[]).includes(normalized)) {
    return normalized as DxMarkdownLanguage;
  }
  if (normalized === "javascript") return "js";
  if (normalized === "typescript") return "ts";
  if (normalized === "py") return "python";
  if (normalized === "sh" || normalized === "zsh") return "bash";
  return "text";
}

export { LIGHT_THEME, DARK_THEME };
