import { describe, expect, test } from "bun:test";

import { createScheduler } from "./scheduler";

describe("runtime scheduler", () => {
  test("runs one instance of a job by default", async () => {
    const blockers: Array<() => void> = [];
    const scheduler = createScheduler({
      jobs: [
        {
          name: "serial-job",
          intervalMs: 5,
          run: () =>
            new Promise<void>((resolve) => {
              blockers.push(resolve);
            }),
        },
      ],
    });

    scheduler.start();
    await waitFor(() => blockers.length === 1);
    await sleep(25);

    expect(blockers).toHaveLength(1);

    const stopped = scheduler.stop();
    releaseAll({ blockers });
    await stopped;
  });

  test("runs up to the configured job concurrency", async () => {
    const blockers: Array<() => void> = [];
    const scheduler = createScheduler({
      jobs: [
        {
          name: "parallel-job",
          intervalMs: 5,
          concurrency: 2,
          run: () =>
            new Promise<void>((resolve) => {
              blockers.push(resolve);
            }),
        },
      ],
    });

    scheduler.start();
    await waitFor(() => blockers.length === 2);
    await sleep(25);

    expect(blockers).toHaveLength(2);

    const stopped = scheduler.stop();
    releaseAll({ blockers });
    await stopped;
  });

  test("stop returns immediately when jobs are still mid-flight", async () => {
    let started = 0;
    const scheduler = createScheduler({
      jobs: [
        {
          name: "never-resolving-job",
          intervalMs: 5,
          run: () => {
            started += 1;
            // Never resolves — mimics a long-running Claude agent turn that
            // can't be cancelled cleanly from the scheduler.
            return new Promise<void>(() => {});
          },
        },
      ],
    });

    scheduler.start();
    await waitFor(() => started >= 1);

    const stopStart = Date.now();
    await scheduler.stop();
    const stopElapsed = Date.now() - stopStart;

    // The old implementation awaited Promise.race with a 5-second timeout;
    // the new implementation just clears the intervals and returns. Should be
    // well under 500ms even on a slow CI box.
    expect(stopElapsed).toBeLessThan(500);
  });
});

async function waitFor(predicate: () => boolean): Promise<void> {
  const startedAt = Date.now();
  while (!predicate()) {
    if (Date.now() - startedAt > 500) {
      throw new Error("Timed out waiting for scheduler condition.");
    }
    await sleep(5);
  }
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function releaseAll({ blockers }: { blockers: Array<() => void> }): void {
  for (const release of blockers.splice(0)) {
    release();
  }
}
