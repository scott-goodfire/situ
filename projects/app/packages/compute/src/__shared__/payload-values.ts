export function computeStringPayloadValue({
  payload,
  key,
}: {
  payload: Record<string, unknown>;
  key: string;
}): string | undefined {
  const value = payload[key];
  return typeof value === "string" && value.trim() ? value.trim() : undefined;
}

export function metadataEnvValue({ value }: { value: unknown }): string | undefined {
  if (typeof value === "string") {
    return value;
  }
  if (typeof value === "number" && Number.isInteger(value)) {
    return String(value);
  }
  return undefined;
}
