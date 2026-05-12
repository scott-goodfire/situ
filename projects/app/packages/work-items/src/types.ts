import type { BunSQLiteDatabase } from "drizzle-orm/bun-sqlite";
import { z } from "zod";

import type { workItems } from "./schema";

/**
 * Loose db type so the package doesn't need to know the full app schema.
 * Calls that need schema typing are written as `.select().from(table)`
 * instead of `db.query.<table>` so this minimal generic is sufficient.
 */
export type WorkItemsDb = BunSQLiteDatabase<Record<string, unknown>>;

export type WorkItem = typeof workItems.$inferSelect;
export type WorkItemRecord = WorkItem;
export type WorkItemStatus = WorkItem["status"];

export type WorkItemHandler = (args: { workItem: WorkItem }) => Promise<void>;

export const workItemPayloadSchema = z
  .object({
    content: z.string().optional(),
    claudeAgentRunId: z.string().optional(),
    researchProjectId: z.string().optional(),
    researchProjectPhase: z.string().optional(),
    activeResearchTaskId: z.string().optional(),
    computeTargetId: z.string().optional(),
    lastError: z.string().optional(),
    reportOutputDir: z.string().optional(),
    modelOverride: z.string().optional(),
  })
  .loose();

export type WorkItemPayload = z.infer<typeof workItemPayloadSchema>;

export type RecordAppEvent = (args: {
  type: string;
  message: string;
  payload?: Record<string, unknown>;
}) => Promise<void>;

export type WorkItemsRunSyncedWrite = <Result>(args: {
  write: (input: { db: WorkItemsDb; syncVersion: number }) => Result;
  notify?: boolean;
}) => { result: Result; syncVersion: number };

/**
 * `getDb` is a thunk so the app can hand the package a late-binding lookup.
 * Tests that reset the db with `resetDbForTests()` create a new db object
 * on the next `getDb()` call — the package re-reads through the thunk
 * every time, so it picks up the new db automatically.
 */
export type WorkItemsContext = {
  getDb: () => WorkItemsDb;
  runSyncedWrite: WorkItemsRunSyncedWrite;
  recordAppEvent: RecordAppEvent;
};
