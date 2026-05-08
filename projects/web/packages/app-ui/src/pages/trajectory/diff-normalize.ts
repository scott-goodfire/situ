export function splitFilePatches({ diff }: { diff: string }): string[] {
  const lines = normalizeBlankContextLines({ diff }).split("\n");
  const chunks: string[][] = [];
  let current: string[] = [];

  for (const line of lines) {
    if (line.startsWith("diff --git ") && current.length > 0) {
      chunks.push(current);
      current = [];
    }
    current.push(line);
  }

  if (current.length > 0) chunks.push(current);
  return chunks.map((chunk) => chunk.join("\n")).filter((chunk) => chunk.trim().length > 0);
}

export function normalizeBlankContextLines({ diff }: { diff: string }): string {
  return diff
    .split("\n")
    .map((line) => (line === "" ? " " : line))
    .join("\n");
}
