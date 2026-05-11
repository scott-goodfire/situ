function keys<T extends object>({ value }: { value: T }): Array<Extract<keyof T, string>> {
  return Object.keys(value) as Array<Extract<keyof T, string>>;
}

function entries<T extends object>({
  value,
}: {
  value: T;
}): Array<[Extract<keyof T, string>, T[Extract<keyof T, string>]]> {
  return Object.entries(value) as Array<[Extract<keyof T, string>, T[Extract<keyof T, string>]]>;
}

export const objectModule = {
  keys,
  entries,
} as const;
