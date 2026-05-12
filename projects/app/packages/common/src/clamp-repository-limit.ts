export function clampRepositoryLimit({
  limit = 10,
  max = 50,
}: {
  limit?: number;
  max?: number;
} = {}): number {
  const normalizedLimit = Number.isFinite(limit) ? Math.trunc(limit) : 10;
  const normalizedMax = Number.isFinite(max) ? Math.trunc(max) : 50;
  return Math.max(1, Math.min(normalizedLimit, normalizedMax));
}
