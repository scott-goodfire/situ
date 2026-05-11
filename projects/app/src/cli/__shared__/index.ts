export function printResult({
  json,
  value,
  text,
}: {
  json: boolean;
  value: unknown;
  text: string;
}): void {
  console.log(json ? JSON.stringify(value, null, 2) : text);
}
