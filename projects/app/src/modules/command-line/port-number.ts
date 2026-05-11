export function portNumber({ value, flag }: { value: string; flag: string }): number {
  const parsed = Number(value);
  if (!Number.isInteger(parsed) || parsed < 0 || parsed > 65535) {
    throw new Error(`invalid ${flag} value: ${value}`);
  }
  return parsed;
}
