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
