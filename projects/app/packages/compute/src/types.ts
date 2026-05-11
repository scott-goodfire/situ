import type { BunSQLiteDatabase } from "drizzle-orm/bun-sqlite";

import type { computeTargets } from "./schema";

/**
 * Loose db type so the package doesn't need to know the full app schema.
 * The app passes its typed db client to `configureCompute`; calls that need
 * schema typing are written as `.select().from(table)` instead of
 * `db.query.<table>` so this minimal generic is sufficient.
 */
export type ComputeDb = BunSQLiteDatabase<Record<string, unknown>>;

export type ComputeTargetRecord = typeof computeTargets.$inferSelect;
export type ComputeTargetStatus = "idle" | "claimed" | "draining" | "dead";

export type ResearchTaskComputeClaim = {
  target: ComputeTargetRecord | undefined;
  pool: string | undefined;
  poolKnown: boolean;
  required: boolean;
};

/**
 * Minimal shape the compute package needs from a ResearchTask row. The full
 * record in the app has many more fields, but for pool resolution and
 * claiming we only need `id`, `type`, and `payloadJson`.
 */
export type ResearchTaskLike = {
  id: string;
  type: string;
  payloadJson: string;
};

/**
 * Minimal shape the compute package needs from a WorkItem row. The full
 * record has many more fields, but compute env/heartbeat/release only read
 * `payloadJson`.
 */
export type WorkItemLike = {
  payloadJson: string;
};

export type RecordAppEvent = (args: {
  type: string;
  message: string;
  payload?: Record<string, unknown>;
}) => Promise<void>;

export type ComputeRunSyncedWrite = <Result>(args: {
  write: (input: { db: ComputeDb; syncVersion: number }) => Result;
  notify?: boolean;
}) => { result: Result; syncVersion: number };

/**
 * `getDb` is a thunk rather than a direct db reference so the app can hand
 * the package a late-binding lookup. Tests that reset the db with
 * `resetDbForTests()` create a new db object on the next `getDb()` call —
 * because the package re-reads through the thunk every time, it picks up
 * the new db automatically.
 */
export type ComputeContext = {
  getDb: () => ComputeDb;
  runSyncedWrite: ComputeRunSyncedWrite;
  recordAppEvent: RecordAppEvent;
};

export type ComputeBlockerKind = "missing_pool" | "busy_pool";

export type ComputeBlocker = {
  kind: ComputeBlockerKind;
  researchTaskId: string;
  researchTaskTitle: string;
  pool: string;
  totalTargets: number;
  idleTargets: number;
  claimedTargets: number;
  message: string;
};

export type ComputeBlockerResearchTaskRow = {
  id: string;
  type: string;
  title: string;
  payloadJson: string;
};

export type ComputeBlockerTargetRow = {
  id: string;
  pool: string;
  status: ComputeTargetStatus;
};
