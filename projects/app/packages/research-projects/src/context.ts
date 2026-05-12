import type { ResearchProjectsContext } from "./types";

let configured: ResearchProjectsContext | undefined;

/**
 * Wire the research-projects package up at app boot. The app passes its db
 * thunk and `runSyncedWrite` helper. No `recordAppEvent` callback — these
 * repositories don't write to `app_events`.
 */
export function configureResearchProjects(context: ResearchProjectsContext): void {
  configured = context;
}

export function getResearchProjectsContext(): ResearchProjectsContext {
  if (!configured) {
    throw new Error(
      "@situ/research-projects has not been configured. Call configureResearchProjects({ getDb, runSyncedWrite }) at app boot before invoking research-project operations.",
    );
  }
  return configured;
}

export function resetResearchProjectsContextForTests(): void {
  configured = undefined;
}
