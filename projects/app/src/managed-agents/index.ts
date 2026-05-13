import type { AgentSessionRecord } from "@situ/agent-sessions";
import type { TargetRef } from "@situ/common";

import type { AppActions } from "../actions";

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
};

/**
 * Creates the Claude managed-agents runtime.
 */
export const createManagedAgentsRuntime = ({ actions }: CreateManagedAgentsRuntimeInput) => ({
  wakeClaudeAgent({
    agentId,
    notificationId,
    remoteClaudeAgentId,
    remoteClaudeSessionId,
    remoteClaudeThreadId,
    target,
  }: WakeClaudeAgentInput): AgentSessionRecord {
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
});

export type ManagedAgentsRuntime = ReturnType<typeof createManagedAgentsRuntime>;
