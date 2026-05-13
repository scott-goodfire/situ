import type { AgentSessionRecord } from "@situ/agent-sessions";
import type { TargetRef } from "@situ/common";
import { createId, nowIso } from "@situ/common";

import type { AppActions } from "../actions";
import type { AppRepositories } from "../actions/repositories";

export type WakeClaudeAgentInput = {
  agentId: string;
  notificationId: string;
  remoteClaudeAgentId?: string;
  remoteClaudeSessionId?: string;
  remoteClaudeThreadId?: string;
  target: TargetRef;
};

export type CreateManagedAgentsRuntimeInput = {
  actions: AppActions;
  repositories: AppRepositories;
};

export type RecordClaudeRemoteEventInput = {
  agentSessionId: string;
  cursor?: string;
  payload: Record<string, unknown>;
  remoteId?: string;
  summary: string;
};

const canResumeSession = ({
  session,
  target,
}: {
  session: AgentSessionRecord;
  target: TargetRef;
}): boolean => {
  if (
    session.context?.targetKind !== target.targetKind ||
    session.context.targetId !== target.targetId
  ) {
    return false;
  }

  return session.status === "active" || session.status === "idle";
};

/**
 * Creates the Claude managed-agents runtime.
 */
export const createManagedAgentsRuntime = ({
  actions,
  repositories,
}: CreateManagedAgentsRuntimeInput) => ({
  wakeClaudeAgent({
    agentId,
    notificationId,
    remoteClaudeAgentId,
    remoteClaudeSessionId,
    remoteClaudeThreadId,
    target,
  }: WakeClaudeAgentInput): AgentSessionRecord {
    const existing = repositories.agentSessions
      .listByAgent({ agentId })
      .find((session) => canResumeSession({ session, target }));

    if (existing !== undefined) {
      return actions.updateAgentSessionStatus({
        agentSessionId: existing.id,
        currentNotificationId: notificationId,
        status: "active",
      });
    }

    return actions.createAgentSession({
      agentId,
      context: target,
      currentNotificationId: notificationId,
      remoteClaudeAgentId,
      remoteClaudeSessionId,
      remoteClaudeThreadId,
      status: "active",
    });
  },

  recordClaudeRemoteEvent({
    agentSessionId,
    cursor,
    payload,
    remoteId,
    summary,
  }: RecordClaudeRemoteEventInput) {
    const log = repositories.agentSessions.createLog({
      log: {
        agentSessionId,
        createdAt: nowIso(),
        id: createId("agent_session_log"),
        payload,
        remoteId,
        summary,
        type: "remote_event",
      },
    });

    actions.updateAgentSessionStatus({
      agentSessionId,
      remoteEventCursor: cursor,
      status: "active",
    });

    return log;
  },
});

export type ManagedAgentsRuntime = ReturnType<typeof createManagedAgentsRuntime>;
