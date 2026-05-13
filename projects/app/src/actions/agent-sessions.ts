import { advanceSyncMetadata, createSyncMetadata, SYSTEM_ACTOR } from "@situ/common";
import type { AgentSessionRecord } from "@situ/agent-sessions";

import { resolveActionActor } from "./actors";
import { recordEvent } from "./events";
import type { AppRepositories } from "./repositories";
import { ensureTargetExists, targetForAgentSession } from "./targets";
import type {
  Clock,
  CreateAgentSessionInput,
  IdFactory,
  UpdateAgentSessionStatusInput,
} from "./types";

export type CreateAgentSessionActionInput = {
  createId: IdFactory;
  input: CreateAgentSessionInput;
  now: Clock;
  repositories: AppRepositories;
};

export type UpdateAgentSessionStatusActionInput = {
  createId: IdFactory;
  input: UpdateAgentSessionStatusInput;
  now: Clock;
  repositories: AppRepositories;
};

/**
 * Creates an agent session.
 */
export const createAgentSessionAction = ({
  createId,
  input,
  now,
  repositories,
}: CreateAgentSessionActionInput): AgentSessionRecord => {
  const timestamp = now();

  repositories.agents.require({ id: input.agentId });

  if (input.context !== undefined) {
    ensureTargetExists({
      repositories,
      target: input.context,
    });
  }

  if (input.currentNotificationId !== undefined) {
    repositories.notifications.require({ id: input.currentNotificationId });
  }

  const agentSession = repositories.agentSessions.create({
    agentSession: {
      agentId: input.agentId,
      context: input.context,
      currentNotificationId: input.currentNotificationId,
      id: input.id ?? createId("agent_session"),
      lastActivityAt: timestamp,
      parentAgentSessionId: input.parentAgentSessionId,
      remoteClaudeAgentId: input.remoteClaudeAgentId,
      remoteClaudeSessionId: input.remoteClaudeSessionId,
      remoteClaudeThreadId: input.remoteClaudeThreadId,
      status: input.status ?? "active",
      ...createSyncMetadata(),
      createdAt: timestamp,
      updatedAt: timestamp,
    },
  });

  recordEvent({
    createId,
    event: {
      actor: SYSTEM_ACTOR,
      message: "Agent session created",
      payload: {
        agentId: agentSession.agentId,
        agentSessionId: agentSession.id,
      },
      target: targetForAgentSession({ agentSession }),
      type: "agent_session.created",
    },
    now,
    repositories,
  });

  return agentSession;
};

/**
 * Updates agent session status.
 */
export const updateAgentSessionStatusAction = ({
  createId,
  input,
  now,
  repositories,
}: UpdateAgentSessionStatusActionInput): AgentSessionRecord => {
  const actor = resolveActionActor({
    actor: input.actor,
    repositories,
  });
  const agentSession = repositories.agentSessions.require({
    id: input.agentSessionId,
  });

  if (input.currentNotificationId !== undefined) {
    repositories.notifications.require({
      id: input.currentNotificationId,
    });
  }

  const timestamp = now();
  const updated = repositories.agentSessions.update({
    agentSession: {
      ...agentSession,
      currentNotificationId: input.currentNotificationId ?? agentSession.currentNotificationId,
      lastActivityAt: timestamp,
      remoteEventCursor: input.remoteEventCursor ?? agentSession.remoteEventCursor,
      ...advanceSyncMetadata({ record: agentSession }),
      status: input.status,
      updatedAt: timestamp,
    },
  });

  recordEvent({
    createId,
    event: {
      actor,
      message: `Agent session status changed from ${agentSession.status} to ${updated.status}`,
      payload: {
        from: agentSession.status,
        to: updated.status,
      },
      target: targetForAgentSession({ agentSession: updated }),
      type: "agent_session.status_updated",
    },
    now,
    repositories,
  });

  return updated;
};
