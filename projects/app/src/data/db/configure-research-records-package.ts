import { configureResearchRecords } from "@situ/research-records";

import { getDb } from "./client";
import { runSyncedWrite } from "./sync";

/**
 * Wire the @situ/research-records package up with the app's db and
 * runSyncedWrite helper. Same dynamic-import shape as
 * configure-compute-package / configure-work-items-package.
 */
export function configureResearchRecordsPackage(): void {
  configureResearchRecords({ getDb, runSyncedWrite });
}
