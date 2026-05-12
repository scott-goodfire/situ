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
