function parse<T>({ text }: { text: string }): T {
  try {
    return JSON.parse(text) as T;
  } catch (error) {
    throw new Error(
      `Failed to parse world JSON: ${error instanceof Error ? error.message : String(error)}`,
      { cause: error },
    );
  }
}

function stringify({ value, space }: { value: unknown; space?: number }): string {
  const indent = space ?? undefined;
  return JSON.stringify(value, null, indent);
}

export const jsonModule = {
  parse,
  stringify,
} as const;
