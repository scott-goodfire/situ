function fromLines({ lines }: { lines: string[] }): string {
  const parts = lines;
  return `${parts.join("\n")}\n`;
}

export const textModule = {
  lines: fromLines,
} as const;
