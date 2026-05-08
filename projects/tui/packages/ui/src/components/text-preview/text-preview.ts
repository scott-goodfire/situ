type PreviewTextOptions = {
  value: string;
  maxCharacters?: number;
};

const defaultMaxCharacters = 180;

export function previewText({
  value,
  maxCharacters = defaultMaxCharacters,
}: PreviewTextOptions): string {
  const compactValue = value.replace(/\s+/g, " ").trim();

  if (compactValue.length <= maxCharacters) {
    return compactValue;
  }

  const visibleText = compactValue.slice(0, Math.max(maxCharacters - 1, 0)).trimEnd();

  return `${visibleText}…`;
}
