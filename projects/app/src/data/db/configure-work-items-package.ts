import { configureWorkItems } from "@situ/work-items";

import { recordAppEvent } from "../../app-events";
import { getDb } from "./client";
import { runSyncedWrite } from "./sync";

/**
 * Wire the @situ/work-items package up with the app's db, runSyncedWrite
 * helper, and recordAppEvent writer. Same dynamic-import shape as
 * configure-compute-package — keeps client.ts free of the
 * `client → app-events → sync → client` import cycle.
 */
export function configureWorkItemsPackage(): void {
  configureWorkItems({ getDb, runSyncedWrite, recordAppEvent });
}
