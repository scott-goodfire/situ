function normalizeMarkerText({ value }: { value: string }): string {
  return value.replaceAll(/\s+/g, " ").trim();
}

export const markerTextModule = {
  normalizeMarkerText,
} as const;
