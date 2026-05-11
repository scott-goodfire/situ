function parse<T>({ text }: { text: string }): T {
  const value = JSON.parse(text) as unknown;
  return value as T;
}

function stringify({ value, space }: { value: unknown; space?: number }): string {
  const json = JSON.stringify(value, null, space);
  if (json === undefined) {
    throw new Error("Unable to stringify e2e JSON payload.");
  }
  return json;
}

export const jsonModule = {
  parse,
  stringify,
} as const;
