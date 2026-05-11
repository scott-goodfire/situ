export function parseRecord({ raw }: { raw: string }): Record<string, unknown> {
  if (!raw) {
    return {};
  }
  try {
    const value = JSON.parse(raw);
    return coerceRecord({ value });
  } catch {
    return {};
  }
}

export function coerceRecord({ value }: { value: unknown }): Record<string, unknown> {
  if (value && typeof value === "object" && !Array.isArray(value)) {
    return value as Record<string, unknown>;
  }
  return {};
}
