function parse<T>({ text }: { text: string }): T {
  const parsed: unknown = JSON.parse(text);
  return parsed as T;
}

function stringify({ value, space }: { value: unknown; space?: number }): string {
  if (space === undefined) {
    return JSON.stringify(value);
  }
  return JSON.stringify(value, null, space);
}

export const jsonModule = {
  parse,
  stringify,
} as const;
