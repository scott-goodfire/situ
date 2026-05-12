import { configureResearchProjects } from "@situ/research-projects";

import { getDb } from "./client";
import { runSyncedWrite } from "./sync";

/**
 * Wire the @situ/research-projects package up. Same dynamic-import shape as
 * the other workspace packages — keeps client.ts free of the
 * `client → app-events → sync → client` import cycle.
 */
export function configureResearchProjectsPackage(): void {
  configureResearchProjects({ getDb, runSyncedWrite });
}
