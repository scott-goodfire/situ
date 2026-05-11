export type LogLevel = "debug" | "info" | "warn" | "error";
export type LogOutputMode = "human" | "json";

const LEVELS = new Set<LogLevel>(["debug", "info", "warn", "error"]);

export function logLevel(): LogLevel {
  const value = process.env.SITU_LOG_LEVEL?.trim().toLowerCase();
  if (value && LEVELS.has(value as LogLevel)) {
    return value as LogLevel;
  }
  return "info";
}

export function logOutputMode({
  stderrIsTty = process.stderr.isTTY,
}: { stderrIsTty?: boolean | undefined } = {}): LogOutputMode {
  return stderrIsTty === true ? "human" : "json";
}
