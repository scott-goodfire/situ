import { nowIso } from "@situ/common";

import type { AppDatabase } from "../db";
import { createPullPatch } from "./serializers";
import type { ReplicachePullRequest, ReplicachePullResponse } from "./types";

export type CreatePullResponseInput = {
  db: AppDatabase;
  request?: ReplicachePullRequest;
};

type ReplicacheClientRow = {
  client_id: string;
  last_mutation_id: number;
};

const resolveCookie = ({ request }: { request?: ReplicachePullRequest }): string | undefined => {
  if (typeof request?.cookie !== "string") {
    return undefined;
  }

  return request.cookie;
};

const loadLastMutationIdChanges = ({ db }: { db: AppDatabase }): Record<string, number> => {
  const rows = db.$client
    .query("SELECT client_id, last_mutation_id FROM replicache_clients")
    .all() as ReplicacheClientRow[];

  return Object.fromEntries(rows.map((row) => [row.client_id, row.last_mutation_id]));
};

/**
 * Creates a Replicache pull response.
 */
export const createPullResponse = ({
  db,
  request,
}: CreatePullResponseInput): ReplicachePullResponse => {
  const cookie = resolveCookie({ request });

  return {
    cookie: nowIso(),
    lastMutationIDChanges: loadLastMutationIdChanges({ db }),
    patch: createPullPatch({
      cookie,
      db,
    }),
  };
};
