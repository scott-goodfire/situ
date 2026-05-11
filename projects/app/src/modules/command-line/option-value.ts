export type CommandLineOptionValue = boolean | number | string | readonly unknown[] | undefined;

export function optionalStringOption({
  value,
  flag,
}: {
  value: CommandLineOptionValue;
  flag: string;
}): string | undefined {
  if (value === undefined) {
    return undefined;
  }
  if (Array.isArray(value)) {
    const lastValue = value.at(-1);
    return optionalStringOption({
      value: lastValue as CommandLineOptionValue,
      flag,
    });
  }
  if (typeof value === "string" || typeof value === "number") {
    const stringValue = String(value);
    if (!stringValue) {
      throw new Error(`${flag} requires a value`);
    }
    return stringValue;
  }
  throw new Error(`${flag} requires a value`);
}

export function booleanOption({ value }: { value: CommandLineOptionValue }): boolean {
  if (Array.isArray(value)) {
    return value.some((entry) => entry === true);
  }
  return value === true;
}
