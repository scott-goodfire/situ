type StripOptions = {
  maxLength?: number;
};

function stripMarkdown(text: string | null | undefined, options: StripOptions = {}): string {
  if (!text) {
    return "";
  }
  const stripped = text
    .replace(/```[\s\S]*?```/g, " ")
    .replace(/`([^`]+)`/g, "$1")
    .replace(/!\[([^\]]*)\]\([^)]*\)/g, "")
    .replace(/\[([^\]]+)\]\([^)]*\)/g, "$1")
    .replace(/^#{1,6}\s+/gm, "")
    .replace(/^\s*[-*+]\s+/gm, "")
    .replace(/^\s*\d+\.\s+/gm, "")
    .replace(/^\s*>\s?/gm, "")
    .replace(/\*\*\*([^*]+)\*\*\*/g, "$1")
    .replace(/\*\*([^*]+)\*\*/g, "$1")
    .replace(/\*([^*]+)\*/g, "$1")
    .replace(/__([^_]+)__/g, "$1")
    .replace(/_([^_]+)_/g, "$1")
    .replace(/~~([^~]+)~~/g, "$1")
    .replace(/\s+/g, " ")
    .trim();

  if (options.maxLength !== undefined && stripped.length > options.maxLength) {
    return `${stripped.slice(0, options.maxLength).trimEnd()}…`;
  }
  return stripped;
}

export const markdownModule = {
  strip: stripMarkdown,
};
