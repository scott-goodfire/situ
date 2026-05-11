import { sql } from "drizzle-orm";
import { index, integer, sqliteTable, text } from "drizzle-orm/sqlite-core";

/**
 * Compute target table. The drizzle table type is consumed by the repository
 * in this package and re-exported by `@situ/app`'s schema barrel so the unified
 * database client sees one table object — drizzle compares column references
 * by identity.
 */
export const computeTargets = sqliteTable(
  "compute_targets",
  {
    id: text("id").primaryKey(),
    pool: text("pool").notNull(),
    kind: text("kind").notNull().default("local"),
    label: text("label"),
    status: text("status", {
      enum: ["idle", "claimed", "draining", "dead"],
    })
      .notNull()
      .default("idle"),
    claimedByResearchTaskId: text("claimed_by_research_task_id"),
    claimedAt: text("claimed_at"),
    leaseExpiresAt: text("lease_expires_at"),
    lastHeartbeat: text("last_heartbeat"),
    metadataJson: text("metadata_json").notNull().default("{}"),
    syncVersion: integer("sync_version").notNull().default(1),
    syncDeleted: integer("sync_deleted", { mode: "boolean" }).notNull().default(false),
    createdAt: text("created_at")
      .notNull()
      .default(sql`CURRENT_TIMESTAMP`),
    updatedAt: text("updated_at")
      .notNull()
      .default(sql`CURRENT_TIMESTAMP`),
  },
  (table) => ({
    poolStatusIdx: index("compute_targets_pool_status_idx").on(table.pool, table.status),
  }),
);

/**
 * SQL fragment for the runtime migrator. The app's `data/db/migrate.ts`
 * interpolates this into the full schema string so the runtime bootstrap
 * stays a single audit-friendly file.
 *
 * The FK on `claimed_by_research_task_id` references `research_tasks(id)` —
 * that table is defined by the app, so this fragment can only be applied
 * after `research_tasks` exists.
 */
export const COMPUTE_TARGETS_TABLE_SQL = `
CREATE TABLE IF NOT EXISTS compute_targets (
  id TEXT PRIMARY KEY,
  pool TEXT NOT NULL,
  kind TEXT NOT NULL DEFAULT 'local',
  label TEXT,
  status TEXT NOT NULL DEFAULT 'idle'
    CHECK (status IN ('idle', 'claimed', 'draining', 'dead')),
  claimed_by_research_task_id TEXT REFERENCES research_tasks(id),
  claimed_at TEXT,
  lease_expires_at TEXT,
  last_heartbeat TEXT,
  metadata_json TEXT NOT NULL DEFAULT '{}',
  sync_version INTEGER NOT NULL DEFAULT 1,
  sync_deleted INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS compute_targets_pool_status_idx
  ON compute_targets(pool, status);
`;
