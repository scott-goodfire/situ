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
