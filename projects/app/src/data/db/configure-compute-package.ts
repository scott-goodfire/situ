import { configureCompute } from "@situ/compute";

import { recordAppEvent } from "../../app-events";
import { getDb } from "./client";
import { runSyncedWrite } from "./sync";

/**
 * Wire the @situ/compute package up with the app's db, runSyncedWrite helper,
 * and recordAppEvent writer. The `getDb` reference is a thunk so the package
 * always reads the current db — `resetDbForTests()` makes the next `getDb()`
 * call return a fresh db object, and compute operations pick it up
 * automatically without any rewiring.
 *
 * Called from ensureRuntimeContext via dynamic import. This file imports
 * `./client`, `./sync`, and `../../app-events`; loading it statically from
 * `./client.ts` would form a cycle (client → app-events → sync → client),
 * so the dynamic import in session-context keeps the static graph acyclic.
 */
export function configureComputePackage(): void {
  configureCompute({ getDb, runSyncedWrite, recordAppEvent });
}
