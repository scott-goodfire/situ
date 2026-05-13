import { InvalidArgumentError, toErrorDetails } from "@situ/errors";
import { nowIso } from "@situ/common";

import type { AppActions } from "../actions";
import type { AppDatabase } from "../db";
import type {
  ReplicacheMutation,
  ReplicacheMutationResult,
  ReplicachePushRequest,
  ReplicachePushResponse,
} from "./types";

export type ApplyMutationInput = {
  actions: AppActions;
  mutation: ReplicacheMutation;
};

export type ApplyPushInput = {
  actions: AppActions;
  db: AppDatabase;
  request: ReplicachePushRequest;
};

const asMutationArgs = <T>({ args }: { args: unknown }): T => {
  if (typeof args !== "object" || args === null || Array.isArray(args)) {
    throw new InvalidArgumentError({
      details: {
        args,
      },
      message: "Replicache mutation args must be an object",
    });
  }

  return args as T;
};

/**
 * Applies one Replicache mutation.
 */
export const applyMutation = ({ actions, mutation }: ApplyMutationInput): unknown => {
  if (mutation.name === "project/create") {
    return actions.createProject(asMutationArgs({ args: mutation.args }));
  }

  if (mutation.name === "agent/create") {
    return actions.createAgent(asMutationArgs({ args: mutation.args }));
  }

  if (mutation.name === "label/create") {
    return actions.createLabel(asMutationArgs({ args: mutation.args }));
  }

  if (mutation.name === "task/create") {
    return actions.createTask(asMutationArgs({ args: mutation.args }));
  }

  if (mutation.name === "task/assign") {
    return actions.assignTask(asMutationArgs({ args: mutation.args }));
  }

  if (mutation.name === "task/update_status") {
    return actions.updateTaskStatus(asMutationArgs({ args: mutation.args }));
  }

  if (mutation.name === "comment/create") {
    return actions.createComment(asMutationArgs({ args: mutation.args }));
  }

  if (mutation.name === "notification/mark_read") {
    return actions.markNotificationRead(asMutationArgs({ args: mutation.args }));
  }

  if (mutation.name === "notification/mark_unread") {
    return actions.markNotificationUnread(asMutationArgs({ args: mutation.args }));
  }

  if (mutation.name === "notification/dismiss") {
    return actions.dismissNotification(asMutationArgs({ args: mutation.args }));
  }

  if (mutation.name === "notification/snooze") {
    return actions.snoozeNotification(asMutationArgs({ args: mutation.args }));
  }

  if (mutation.name === "notification/record_delivery_attempt") {
    return actions.recordNotificationDeliveryAttempt(asMutationArgs({ args: mutation.args }));
  }

  if (mutation.name === "agent_session/create") {
    return actions.createAgentSession(asMutationArgs({ args: mutation.args }));
  }

  if (mutation.name === "agent_session/update_status") {
    return actions.updateAgentSessionStatus(asMutationArgs({ args: mutation.args }));
  }

  if (mutation.name === "experiment/create") {
    return actions.createExperiment(asMutationArgs({ args: mutation.args }));
  }

  if (mutation.name === "experiment/update_status") {
    return actions.updateExperimentStatus(asMutationArgs({ args: mutation.args }));
  }

  if (mutation.name === "experiment/capture_candidate_commit") {
    return actions.captureCandidateCommit(asMutationArgs({ args: mutation.args }));
  }

  if (mutation.name === "measurement/create") {
    return actions.createMeasurement(asMutationArgs({ args: mutation.args }));
  }

  if (mutation.name === "artifact/create") {
    return actions.createArtifact(asMutationArgs({ args: mutation.args }));
  }

  if (mutation.name === "review/create") {
    return actions.createReview(asMutationArgs({ args: mutation.args }));
  }

  throw new InvalidArgumentError({
    details: {
      mutationName: mutation.name,
    },
    message: `Unsupported Replicache mutation: ${mutation.name}`,
  });
};

const resolveClientId = ({ request }: { request: ReplicachePushRequest }): string => {
  if (request.clientID !== undefined) {
    return request.clientID;
  }

  if (request.clientId !== undefined) {
    return request.clientId;
  }

  return "anonymous";
};

const hasMutationRun = ({
  clientId,
  db,
  mutationId,
}: {
  clientId: string;
  db: AppDatabase;
  mutationId: number;
}): boolean => {
  const row = db.$client
    .query("SELECT mutation_id FROM replicache_mutations WHERE client_id = ? AND mutation_id = ?")
    .get(clientId, mutationId);

  return row !== null && row !== undefined;
};

const recordMutationRun = ({
  clientId,
  db,
  mutationId,
}: {
  clientId: string;
  db: AppDatabase;
  mutationId: number;
}): void => {
  db.$client
    .query(
      `
        INSERT OR IGNORE INTO replicache_mutations (client_id, mutation_id, created_at)
        VALUES (?, ?, ?)
      `,
    )
    .run(clientId, mutationId, nowIso());
};

/**
 * Applies a Replicache push request.
 */
export const applyPush = ({ actions, db, request }: ApplyPushInput): ReplicachePushResponse => {
  const clientId = resolveClientId({ request });
  const mutationResults: ReplicacheMutationResult[] = [];

  for (const mutation of request.mutations ?? []) {
    if (hasMutationRun({ clientId, db, mutationId: mutation.id })) {
      mutationResults.push({
        id: mutation.id,
        ok: true,
        result: {
          skipped: true,
        },
      });
      continue;
    }

    try {
      const result = applyMutation({ actions, mutation });
      recordMutationRun({ clientId, db, mutationId: mutation.id });
      mutationResults.push({
        id: mutation.id,
        ok: true,
        result,
      });
    } catch (error) {
      mutationResults.push({
        error: toErrorDetails({
          value: error,
        }),
        id: mutation.id,
        ok: false,
      });
    }
  }

  return {
    mutationResults,
  };
};
