import { agentSessionLogs, agentSessions } from "@situ/agent-sessions";
import { agents } from "@situ/agents";
import { artifacts } from "@situ/artifacts";
import { comments } from "@situ/comments";
import { events } from "@situ/events";
import { experiments } from "@situ/experiments";
import { measurements } from "@situ/measurements";
import { notifications } from "@situ/notifications";
import { projects } from "@situ/projects";
import { reviews } from "@situ/reviews";
import { labels, tasks } from "@situ/tasks";
import type { BunSQLiteDatabase } from "drizzle-orm/bun-sqlite";
import type { SQLiteTable } from "drizzle-orm/sqlite-core";

import type { ReplicachePullPatchOperation } from "./types";

export type SyncSerializer = {
  key(input: { row: Record<string, unknown> }): string;
  load(input: { db: BunSQLiteDatabase<Record<string, unknown>> }): Record<string, unknown>[];
};

const keyById = ({ prefix, row }: { prefix: string; row: Record<string, unknown> }): string =>
  `${prefix}/${String(row.id)}`;

const createTableSerializer = ({
  prefix,
  table,
}: {
  prefix: string;
  table: SQLiteTable;
}): SyncSerializer => ({
  key({ row }) {
    return keyById({ prefix, row });
  },

  load({ db }) {
    return db.select().from(table).all() as Record<string, unknown>[];
  },
});

export const syncSerializers: SyncSerializer[] = [
  createTableSerializer({ prefix: "agents", table: agents }),
  createTableSerializer({ prefix: "agent_sessions", table: agentSessions }),
  createTableSerializer({ prefix: "agent_session_logs", table: agentSessionLogs }),
  createTableSerializer({ prefix: "projects", table: projects }),
  createTableSerializer({ prefix: "labels", table: labels }),
  createTableSerializer({ prefix: "tasks", table: tasks }),
  createTableSerializer({ prefix: "experiments", table: experiments }),
  createTableSerializer({ prefix: "measurements", table: measurements }),
  createTableSerializer({ prefix: "artifacts", table: artifacts }),
  createTableSerializer({ prefix: "reviews", table: reviews }),
  createTableSerializer({ prefix: "comments", table: comments }),
  createTableSerializer({ prefix: "notifications", table: notifications }),
  createTableSerializer({ prefix: "events", table: events }),
];

export type CreatePullPatchInput = {
  db: BunSQLiteDatabase<Record<string, unknown>>;
};

/**
 * Creates the sync patch.
 */
export const createPullPatch = ({ db }: CreatePullPatchInput): ReplicachePullPatchOperation[] =>
  syncSerializers.flatMap((serializer) =>
    serializer.load({ db }).map((row) => ({
      key: serializer.key({ row }),
      op: "put" as const,
      value: row,
    })),
  );
