import { describe, expect, test } from "bun:test";

import {
  shouldReplaceStalledSession,
  STALLED_RETRY_THRESHOLD,
  STALLED_SWAP_COOLDOWN_MS,
} from "./should-replace-stalled-session";

describe("shouldReplaceStalledSession", () => {
  const now = new Date("2026-05-11T20:30:00.000Z");

  test("does not swap when there are no exhausted-retry events", () => {
    expect(
      shouldReplaceStalledSession({
        exhaustedRetryCountSinceAttach: 0,
        hadSuccessAfterMostRecentExhausted: false,
        lastReplacedAt: undefined,
        now,
      }),
    ).toBe(false);
  });

  test("does not swap below the threshold", () => {
    expect(
      shouldReplaceStalledSession({
        exhaustedRetryCountSinceAttach: STALLED_RETRY_THRESHOLD - 1,
        hadSuccessAfterMostRecentExhausted: false,
        lastReplacedAt: undefined,
        now,
      }),
    ).toBe(false);
  });

  test("swaps once the consecutive exhausted-retry count reaches the threshold", () => {
    expect(
      shouldReplaceStalledSession({
        exhaustedRetryCountSinceAttach: STALLED_RETRY_THRESHOLD,
        hadSuccessAfterMostRecentExhausted: false,
        lastReplacedAt: undefined,
        now,
      }),
    ).toBe(true);
  });

  test("does not swap when a successful turn landed after the most recent exhaustion", () => {
    expect(
      shouldReplaceStalledSession({
        exhaustedRetryCountSinceAttach: STALLED_RETRY_THRESHOLD * 2,
        hadSuccessAfterMostRecentExhausted: true,
        lastReplacedAt: undefined,
        now,
      }),
    ).toBe(false);
  });

  test("honors cooldown after a recent swap", () => {
    const recentSwap = new Date(now.getTime() - (STALLED_SWAP_COOLDOWN_MS - 1_000));
    expect(
      shouldReplaceStalledSession({
        exhaustedRetryCountSinceAttach: STALLED_RETRY_THRESHOLD,
        hadSuccessAfterMostRecentExhausted: false,
        lastReplacedAt: recentSwap,
        now,
      }),
    ).toBe(false);
  });

  test("swaps again once the cooldown window has elapsed", () => {
    const oldSwap = new Date(now.getTime() - (STALLED_SWAP_COOLDOWN_MS + 1_000));
    expect(
      shouldReplaceStalledSession({
        exhaustedRetryCountSinceAttach: STALLED_RETRY_THRESHOLD,
        hadSuccessAfterMostRecentExhausted: false,
        lastReplacedAt: oldSwap,
        now,
      }),
    ).toBe(true);
  });

  test("threshold is 10 and cooldown is 2 minutes", () => {
    expect(STALLED_RETRY_THRESHOLD).toBe(10);
    expect(STALLED_SWAP_COOLDOWN_MS).toBe(120_000);
  });
});
