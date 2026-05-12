import { sql } from "drizzle-orm";
import { index, integer, sqliteTable, text, uniqueIndex } from "drizzle-orm/sqlite-core";

/**
 * Work-item table. Owned by `@situ/work-items`. The drizzle table type is
 * consumed by the package's repository + operations and re-exported by
 * `@situ/app`'s schema barrel so the unified database client sees one
 * table object.
 *
 * The drizzle .references() to `claudeAgents.id` is dropped here because
 * that table lives in `@situ/app`. The SQL fragment below keeps the FK at
 * the SQLite level.
 */
export const workItems = sqliteTable(
  "work_items",
  {
    id: text("id").primaryKey(),
    purpose: text("purpose").notNull(),
    targetKind: text("target_kind").notNull(),
    targetId: text("target_id").notNull(),
    status: text("status", {
      enum: ["pending", "claimed", "done", "failed", "canceled"],
    })
      .notNull()
      .default("pending"),
    ownerAgentId: text("owner_agent_id"),
    ownerWorkflowId: text("owner_workflow_id"),
    attempt: integer("attempt").notNull().default(0),
    availableAt: text("available_at")
      .notNull()
      .default(sql`CURRENT_TIMESTAMP`),
    claimedAt: text("claimed_at"),
    leaseExpiresAt: text("lease_expires_at"),
    completedAt: text("completed_at"),
    payloadJson: text("payload_json").notNull().default("{}"),
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
    statusAvailableIdx: index("work_items_status_available_idx").on(
      table.status,
      table.availableAt,
    ),
    leaseIdx: index("work_items_lease_idx").on(table.status, table.leaseExpiresAt),
    openTargetIdx: uniqueIndex("work_items_open_target_unique")
      .on(table.purpose, table.targetKind, table.targetId)
      .where(sql`${table.status} IN ('pending', 'claimed')`),
  }),
);

/**
 * SQL fragment for the runtime migrator. The app's `data/db/migrate.ts`
 * interpolates this into the full schema string. The `claude_agents` FK
 * for `owner_agent_id` is preserved here at the SQL level — it requires
 * that table to exist before this fragment is applied.
 */
export const WORK_ITEMS_TABLE_SQL = `
CREATE TABLE IF NOT EXISTS work_items (
  id TEXT PRIMARY KEY,
  purpose TEXT NOT NULL,
  target_kind TEXT NOT NULL,
  target_id TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending', 'claimed', 'done', 'failed', 'canceled')),
  owner_agent_id TEXT REFERENCES claude_agents(id),
  owner_workflow_id TEXT,
  attempt INTEGER NOT NULL DEFAULT 0,
  available_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  claimed_at TEXT,
  lease_expires_at TEXT,
  completed_at TEXT,
  payload_json TEXT NOT NULL DEFAULT '{}',
  sync_version INTEGER NOT NULL DEFAULT 1,
  sync_deleted INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS work_items_status_available_idx
  ON work_items(status, available_at);
CREATE INDEX IF NOT EXISTS work_items_lease_idx
  ON work_items(status, lease_expires_at);
CREATE UNIQUE INDEX IF NOT EXISTS work_items_open_target_unique
  ON work_items(purpose, target_kind, target_id)
  WHERE status IN ('pending', 'claimed');
`;
