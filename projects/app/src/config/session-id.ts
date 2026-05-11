export function sessionIdFromEnv(): string | null {
  const value = process.env.SITU_SESSION_ID?.trim();
  return value ? value : null;
}
