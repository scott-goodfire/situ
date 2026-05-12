import type { ResearchRecordsContext } from "./types";

let configured: ResearchRecordsContext | undefined;

/**
 * Wire the research-records package up at app boot. The app passes its db
 * thunk and `runSyncedWrite` helper. The package itself has no static
 * dependency on the app; no `recordAppEvent` writer is needed because
 * record audit logs go to the per-record `_activities` tables instead of
 * to `app_events`.
 */
export function configureResearchRecords(context: ResearchRecordsContext): void {
  configured = context;
}

export function getResearchRecordsContext(): ResearchRecordsContext {
  if (!configured) {
    throw new Error(
      "@situ/research-records has not been configured. Call configureResearchRecords({ getDb, runSyncedWrite }) at app boot before invoking research-record operations.",
    );
  }
  return configured;
}

export function resetResearchRecordsContextForTests(): void {
  configured = undefined;
}
