export type ResearchRecordStatus =
  | "triage"
  | "accepted"
  | "active"
  | "in_review"
  | "done"
  | "canceled"
  | "failed";

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

export function matchesRepositorySearch({
  query,
  values,
}: {
  query?: string;
  values: Array<string | number | null | undefined>;
}): boolean {
  const normalized = query?.trim().toLowerCase();
  if (!normalized) {
    return true;
  }
  return values
    .filter((value): value is string | number => value !== null && value !== undefined)
    .join("\n")
    .toLowerCase()
    .includes(normalized);
}
