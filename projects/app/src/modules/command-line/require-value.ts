export function requireValue({
  argv,
  index,
  flag,
}: {
  argv: string[];
  index: number;
  flag: string;
}): string {
  const value = argv[index + 1];
  if (!value) {
    throw new Error(`${flag} requires a value`);
  }
  return value;
}
