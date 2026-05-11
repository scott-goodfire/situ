export function safePathSegment({ value }: { value: string }): string {
  return value.replace(/[^a-zA-Z0-9._-]/g, "_");
}

export function clampNumber({
  value,
  min,
  max,
}: {
  value: number;
  min: number;
  max: number;
}): number {
  if (!Number.isFinite(value)) {
    return min;
  }
  return Math.min(Math.max(Math.trunc(value), min), max);
}
