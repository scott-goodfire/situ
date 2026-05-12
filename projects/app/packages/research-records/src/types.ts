import type { BunSQLiteDatabase } from "drizzle-orm/bun-sqlite";

import type {
  artifacts,
  baselineActivities,
  baselines,
  entityLinks,
  evaluationActivities,
  evaluations,
  experimentActivities,
  experiments,
  hypothesisActivities,
  hypotheses,
  measurements,
} from "./schema";

export type ResearchRecordsDb = BunSQLiteDatabase<Record<string, unknown>>;

export type ResearchRecordsRunSyncedWrite = <Result>(args: {
  write: (input: { db: ResearchRecordsDb; syncVersion: number }) => Result;
  notify?: boolean;
}) => { result: Result; syncVersion: number };

/**
 * `getDb` is a thunk so the app can hand the package a late-binding lookup.
 * Tests that reset the db with `resetDbForTests()` create a new db on the
 * next call; the package re-reads through the thunk every time.
 */
export type ResearchRecordsContext = {
  getDb: () => ResearchRecordsDb;
  runSyncedWrite: ResearchRecordsRunSyncedWrite;
};

export type ResearchRecordStatus =
  | "triage"
  | "accepted"
  | "active"
  | "in_review"
  | "done"
  | "canceled"
  | "failed";

export type HypothesisRecord = typeof hypotheses.$inferSelect;
export type HypothesisActivityRecord = typeof hypothesisActivities.$inferSelect;
export type ExperimentRecord = typeof experiments.$inferSelect;
export type ExperimentActivityRecord = typeof experimentActivities.$inferSelect;
export type BaselineRecord = typeof baselines.$inferSelect;
export type BaselineActivityRecord = typeof baselineActivities.$inferSelect;
export type EvaluationRecord = typeof evaluations.$inferSelect;
export type EvaluationActivityRecord = typeof evaluationActivities.$inferSelect;
export type MeasurementRecord = typeof measurements.$inferSelect;
export type ArtifactRecord = typeof artifacts.$inferSelect;
export type EntityLinkRecord = typeof entityLinks.$inferSelect;
