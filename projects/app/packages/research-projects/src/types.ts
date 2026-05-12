import type { BunSQLiteDatabase } from "drizzle-orm/bun-sqlite";

import type { researchProjectInteractions, researchProjects } from "./schema";

export type ResearchProjectsDb = BunSQLiteDatabase<Record<string, unknown>>;

export type ResearchProjectsRunSyncedWrite = <Result>(args: {
  write: (input: { db: ResearchProjectsDb; syncVersion: number }) => Result;
  notify?: boolean;
}) => { result: Result; syncVersion: number };

/**
 * `getDb` is a thunk so the app can hand the package a late-binding lookup;
 * tests that reset the db with `resetDbForTests()` create a new db on the
 * next call and the package re-reads through the thunk.
 */
export type ResearchProjectsContext = {
  getDb: () => ResearchProjectsDb;
  runSyncedWrite: ResearchProjectsRunSyncedWrite;
};

export type ResearchProjectRecord = typeof researchProjects.$inferSelect;
export type ResearchProjectPhase = ResearchProjectRecord["phase"];
export type ResearchProjectStatus = ResearchProjectRecord["status"];

export type ResearchProjectInteractionRecord = typeof researchProjectInteractions.$inferSelect;
export type ResearchProjectInteractionKind = ResearchProjectInteractionRecord["kind"];
export type ResearchProjectInteractionStatus = ResearchProjectInteractionRecord["status"];
