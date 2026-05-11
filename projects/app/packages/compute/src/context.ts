import type { ComputeContext } from "./types";

let configured: ComputeContext | undefined;

/**
 * Wire the compute package up at app boot. The app passes its db client,
 * `runSyncedWrite` helper, and `recordAppEvent` writer — the package itself
 * has no static dependency on the app.
 *
 * Call this exactly once during startup, before any operation or repository
 * method runs.
 */
export function configureCompute(context: ComputeContext): void {
  configured = context;
}

export function getComputeContext(): ComputeContext {
  if (!configured) {
    throw new Error(
      "@situ/compute has not been configured. Call configureCompute({ db, runSyncedWrite, recordAppEvent }) at app boot before invoking compute operations.",
    );
  }
  return configured;
}

/**
 * Test-only escape hatch. Tests that mount a fresh in-memory db can use this
 * to drop the prior context so the next `configureCompute` call wins.
 */
export function resetComputeContextForTests(): void {
  configured = undefined;
}
