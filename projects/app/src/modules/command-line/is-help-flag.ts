export function isHelpFlag({ arg }: { arg: string }): boolean {
  return arg === "-h" || arg === "--help";
}
