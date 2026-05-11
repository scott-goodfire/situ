export const STALLED_RETRY_THRESHOLD = 10;
export const STALLED_SWAP_COOLDOWN_MS = 120_000;

/**
 * Pure decision: should the reconcile loop replace the current Claude
 * managed session because it's been stuck in a retries_exhausted loop?
 *
 * - Triggers at {@link STALLED_RETRY_THRESHOLD} consecutive exhausted-retry
 *   events since the current session attached.
 * - Resets if a successful turn landed after the most recent exhaustion
 *   (the session recovered on its own).
 * - Honors {@link STALLED_SWAP_COOLDOWN_MS} since the most recent swap so a
 *   sustained upstream outage doesn't trigger a swap storm.
 */
export function shouldReplaceStalledSession({
  exhaustedRetryCountSinceAttach,
  hadSuccessAfterMostRecentExhausted,
  lastReplacedAt,
  now,
}: {
  exhaustedRetryCountSinceAttach: number;
  hadSuccessAfterMostRecentExhausted: boolean;
  lastReplacedAt: Date | undefined;
  now: Date;
}): boolean {
  if (hadSuccessAfterMostRecentExhausted) {
    return false;
  }
  if (exhaustedRetryCountSinceAttach < STALLED_RETRY_THRESHOLD) {
    return false;
  }
  if (lastReplacedAt && now.getTime() - lastReplacedAt.getTime() < STALLED_SWAP_COOLDOWN_MS) {
    return false;
  }
  return true;
}
