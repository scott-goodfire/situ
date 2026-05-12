export function decodeProcessOutput({ value }: { value: Uint8Array }): string {
  return new TextDecoder().decode(value);
}

export function mergedCommandEnv({
  env,
}: {
  env?: Record<string, string>;
}): Record<string, string> | undefined {
  if (!env) {
    return undefined;
  }
  const merged: Record<string, string> = {};
  for (const [key, value] of Object.entries(process.env)) {
    if (typeof value === "string") {
      merged[key] = value;
    }
  }
  return { ...merged, ...env };
}
