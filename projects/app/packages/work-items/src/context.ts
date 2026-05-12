import type { WorkItemsContext } from "./types";

let configured: WorkItemsContext | undefined;

/**
 * Wire the work-items package up at app boot. The app passes its db thunk,
 * `runSyncedWrite` helper, and `recordAppEvent` writer — the package itself
 * has no static dependency on the app.
 *
 * Call this exactly once during startup, before any operation or repository
 * method runs.
 */
export function configureWorkItems(context: WorkItemsContext): void {
  configured = context;
}

export function getWorkItemsContext(): WorkItemsContext {
  if (!configured) {
    throw new Error(
      "@situ/work-items has not been configured. Call configureWorkItems({ getDb, runSyncedWrite, recordAppEvent }) at app boot before invoking work-item operations.",
    );
  }
  return configured;
}

export function resetWorkItemsContextForTests(): void {
  configured = undefined;
}
