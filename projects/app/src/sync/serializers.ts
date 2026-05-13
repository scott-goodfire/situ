import { agentSessionsSyncSerializer } from "@situ/agent-sessions";
import { agentsSyncSerializer } from "@situ/agents";
import { artifactsSyncSerializer } from "@situ/artifacts";
import { commentsSyncSerializer } from "@situ/comments";
import { eventsSyncSerializer } from "@situ/events";
import { experimentsSyncSerializer } from "@situ/experiments";
import { measurementsSyncSerializer } from "@situ/measurements";
import { notificationsSyncSerializer } from "@situ/notifications";
import { projectsSyncSerializer } from "@situ/projects";
import { reviewsSyncSerializer } from "@situ/reviews";
import { labelsSyncSerializer, tasksSyncSerializer } from "@situ/tasks";
import type { BunSQLiteDatabase } from "drizzle-orm/bun-sqlite";
import type { SQLiteTable } from "drizzle-orm/sqlite-core";

import type { ReplicachePullPatchOperation } from "./types";

export type SyncSerializer = {
  key(input: { row: Record<string, unknown> }): string;
  load(input: {
    cookie?: string;
    db: BunSQLiteDatabase<Record<string, unknown>>;
  }): Record<string, unknown>[];
};

const keyById = ({ prefix, row }: { prefix: string; row: Record<string, unknown> }): string =>
  `${prefix}/${String(row.id)}`;

const changedAfterCookie = ({
  cookie,
  row,
}: {
  cookie?: string;
  row: Record<string, unknown>;
}): boolean => {
  if (cookie === undefined) {
    return true;
  }

  const updatedAt = row.updatedAt;
  const createdAt = row.createdAt;
  const changedAt = typeof updatedAt === "string" ? updatedAt : createdAt;

  if (typeof changedAt !== "string") {
    return false;
  }

  return changedAt > cookie;
};

const createTableSerializer = ({
  prefix,
  serialize,
  table,
}: {
  prefix: string;
  serialize(input: { row: Record<string, unknown> }): Record<string, unknown>;
  table: SQLiteTable;
}): SyncSerializer => ({
  key({ row }) {
    return keyById({ prefix, row });
  },

  load({ cookie, db }) {
    const rows = db.select().from(table).all() as Record<string, unknown>[];

    return rows
      .filter((row) => changedAfterCookie({ cookie, row }))
      .map((row) => serialize({ row }));
  },
});

export const syncSerializers: SyncSerializer[] = [
  createTableSerializer(agentsSyncSerializer),
  createTableSerializer(agentSessionsSyncSerializer),
  createTableSerializer(projectsSyncSerializer),
  createTableSerializer(labelsSyncSerializer),
  createTableSerializer(tasksSyncSerializer),
  createTableSerializer(experimentsSyncSerializer),
  createTableSerializer(measurementsSyncSerializer),
  createTableSerializer(artifactsSyncSerializer),
  createTableSerializer(reviewsSyncSerializer),
  createTableSerializer(commentsSyncSerializer),
  createTableSerializer(notificationsSyncSerializer),
  createTableSerializer(eventsSyncSerializer),
];

export type CreatePullPatchInput = {
  cookie?: string;
  db: BunSQLiteDatabase<Record<string, unknown>>;
};

/**
 * Creates the sync patch.
 */
export const createPullPatch = ({
  cookie,
  db,
}: CreatePullPatchInput): ReplicachePullPatchOperation[] =>
  syncSerializers.flatMap((serializer) =>
    serializer.load({ cookie, db }).map((row) => ({
      key: serializer.key({ row }),
      op: "put" as const,
      value: row,
    })),
  );
