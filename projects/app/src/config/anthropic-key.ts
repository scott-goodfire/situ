export function anthropicKeyFromEnv(): string | null {
  const value = process.env.SITU_ANTHROPIC_KEY?.trim();
  return value ? value : null;
}
