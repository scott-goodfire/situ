import { nowIso } from "@situ/common";

import type { AppDatabase } from "../db";
import { createPullPatch } from "./serializers";
import type { ReplicachePullResponse } from "./types";

export type CreatePullResponseInput = {
  db: AppDatabase;
};

/**
 * Creates a Replicache pull response.
 */
export const createPullResponse = ({ db }: CreatePullResponseInput): ReplicachePullResponse => ({
  cookie: nowIso(),
  lastMutationIDChanges: {},
  patch: createPullPatch({
    db,
  }),
});
