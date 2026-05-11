const MIN_INTERVAL_MS = 20_000;
const MAX_INTERVAL_MS = 300_000;
const HOLD_SECONDS = 180;
const MID_TARGET_MS = 180_000;
const MID_SECONDS = 12 * 3600;
const FULL_SECONDS = 24 * 3600;

export function scribeIntervalMs({ sessionAgeSeconds }: { sessionAgeSeconds: number }): number {
  const t = sessionAgeSeconds;
  if (t <= HOLD_SECONDS) {
    return MIN_INTERVAL_MS;
  }
  if (t <= MID_SECONDS) {
    const fraction = (t - HOLD_SECONDS) / (MID_SECONDS - HOLD_SECONDS);
    return Math.round(MIN_INTERVAL_MS + fraction * (MID_TARGET_MS - MIN_INTERVAL_MS));
  }
  if (t <= FULL_SECONDS) {
    const fraction = (t - MID_SECONDS) / (FULL_SECONDS - MID_SECONDS);
    return Math.round(MID_TARGET_MS + fraction * (MAX_INTERVAL_MS - MID_TARGET_MS));
  }
  return MAX_INTERVAL_MS;
}
