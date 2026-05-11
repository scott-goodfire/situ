import { jsonModule } from "../../../modules/json";
import { obs, withSpan } from "../../../observability";
import type { ClaudeAgentRole } from "../roles";
import { workItemPayload } from "../../../runtime/work-items/payload";
import type { WorkItem } from "../../../runtime/work-items/types";
import { getAnthropicClient } from "../anthropic-client";
import { eventType, recordManagedEvent, textFromAgentMessage } from "../events";
import {
  createIsolatedManagedSessionForRole,
  ensureManagedSessionForRole,
  replaceManagedSession,
} from "../resources";
import type { ManagedSessionRecord } from "../resources";
import { handleCustomToolUse } from "./handle-custom-tool-use";
import { roleForWorkItem } from "./role-for-work-item";
import {
  attachManagedSessionToRun,
  markRunComplete,
  markRunFailed,
  markRunRunning,
  markRunWaitingForAction,
  updateRunEventCursor,
} from "./run-state";

type AnthropicBeta = Awaited<ReturnType<typeof getAnthropicClient>>["beta"];

type ManagedStreamStats = {
  assistantContent: string;
  assistantMessageCount: number;
  eventCount: number;
  toolUseCount: number;
};

export async function executeClaudeAgentTurn({ workItem }: { workItem: WorkItem }): Promise<void> {
  const payload = workItemPayload({ workItem });
  const content = payload.content;
  const claudeAgentRunId = payload.claudeAgentRunId ?? workItem.targetId;
  if (!content) {
    throw new Error(`Malformed Claude agent turn work item: ${workItem.id}`);
  }

  const role = roleForWorkItem({ workItem });
  const activeResearchTaskId = payload.activeResearchTaskId;

  await withSpan({
    name: obs.span.claude.turn,
    attributes: {
      [obs.attr.claude.runId]: claudeAgentRunId,
      [obs.attr.claude.role]: role,
      [obs.attr.workItem.id]: workItem.id,
      [obs.attr.workItem.purpose]: workItem.purpose,
      [obs.attr.workItem.attempt]: workItem.attempt,
      [obs.attr.workItem.targetKind]: workItem.targetKind,
    },
    fn: () =>
      executeClaudeAgentTurnInner({
        workItem,
        content,
        claudeAgentRunId,
        role,
        activeResearchTaskId,
      }),
  });
}

async function executeClaudeAgentTurnInner({
  workItem,
  content,
  claudeAgentRunId,
  role,
  activeResearchTaskId,
}: {
  workItem: WorkItem;
  content: string;
  claudeAgentRunId: string;
  role: ClaudeAgentRole;
  activeResearchTaskId?: string;
}): Promise<void> {
  let managedSession: ManagedSessionRecord | undefined;
  markRunRunning({ claudeAgentRunId, attempt: workItem.attempt });

  try {
    managedSession = await withSpan({
      name: obs.span.claude.session.ensure,
      attributes: {
        [obs.attr.claude.runId]: claudeAgentRunId,
        [obs.attr.claude.role]: role,
        [obs.attr.workItem.id]: workItem.id,
      },
      fn: () =>
        role === "scientist"
          ? createIsolatedManagedSessionForRole({ role })
          : ensureManagedSessionForRole({ role }),
    });
    const activeManagedSession = managedSession;
    attachManagedSessionToRun({ claudeAgentRunId, managedSession: activeManagedSession });

    const client = await getAnthropicClient();
    const beta = client.beta;
    await withSpan({
      name: obs.span.claude.stream.events,
      attributes: {
        [obs.attr.claude.runId]: claudeAgentRunId,
        [obs.attr.claude.role]: role,
        [obs.attr.claude.agentId]: activeManagedSession.agentId,
        [obs.attr.claude.sessionId]: activeManagedSession.claudeSessionId,
        [obs.attr.workItem.id]: workItem.id,
      },
      fn: async ({ span }) => {
        const stats = emptyManagedStreamStats();
        try {
          await streamClaudeManagedEvents({
            beta,
            managedSession: activeManagedSession,
            content,
            claudeAgentRunId,
            role,
            workItem,
            activeResearchTaskId,
            stats,
          });
        } finally {
          span.setAttribute(obs.attr.claude.eventCount, stats.eventCount);
          span.setAttribute(obs.attr.claude.assistantMessageCount, stats.assistantMessageCount);
          span.setAttribute(obs.attr.claude.assistantTextLength, stats.assistantContent.length);
          span.setAttribute(obs.attr.claude.toolUseCount, stats.toolUseCount);
        }
      },
    });

    markRunComplete({ claudeAgentRunId, managedSession: activeManagedSession });
  } catch (error) {
    markRunFailed({ claudeAgentRunId, error, managedSession });
    throw error;
  }
}

function emptyManagedStreamStats(): ManagedStreamStats {
  return {
    assistantContent: "",
    assistantMessageCount: 0,
    eventCount: 0,
    toolUseCount: 0,
  };
}

async function streamClaudeManagedEvents({
  beta,
  managedSession,
  content,
  claudeAgentRunId,
  role,
  workItem,
  activeResearchTaskId,
  stats,
}: {
  beta: AnthropicBeta;
  managedSession: ManagedSessionRecord;
  content: string;
  claudeAgentRunId: string;
  role: ClaudeAgentRole;
  workItem: WorkItem;
  activeResearchTaskId?: string;
  stats: ManagedStreamStats;
}): Promise<void> {
  const stream = await beta.sessions.events.stream(managedSession.claudeSessionId);
  await beta.sessions.events.send(managedSession.claudeSessionId, {
    events: [
      {
        type: "user.message",
        content: [{ type: "text", text: content }],
      },
    ],
  });

  for await (const event of stream) {
    const shouldStop = await handleManagedSessionEvent({
      event,
      managedSession,
      claudeAgentRunId,
      role,
      workItem,
      activeResearchTaskId,
      stats,
    });
    if (shouldStop) {
      break;
    }
  }
}

async function handleManagedSessionEvent({
  event,
  managedSession,
  claudeAgentRunId,
  role,
  workItem,
  activeResearchTaskId,
  stats,
}: {
  event: unknown;
  managedSession: ManagedSessionRecord;
  claudeAgentRunId: string;
  role: ClaudeAgentRole;
  workItem: WorkItem;
  activeResearchTaskId?: string;
  stats: ManagedStreamStats;
}): Promise<boolean> {
  stats.eventCount += 1;
  await recordManagedEvent({
    agentId: managedSession.agentId,
    event,
  });
  updateRunEventCursor({
    claudeAgentRunId,
    event,
  });

  const type = eventType({ event });
  if (type === "agent.message") {
    stats.assistantMessageCount += 1;
    stats.assistantContent += textFromAgentMessage({ event });
    return false;
  }
  if (type === "agent.custom_tool_use") {
    stats.toolUseCount += 1;
    markRunWaitingForAction({ claudeAgentRunId });
    await handleCustomToolUse({
      event,
      claudeSessionId: managedSession.claudeSessionId,
      claudeAgentRunId,
      role,
      workItem,
      activeResearchTaskId,
      agentId: managedSession.agentId,
    });
    return false;
  }
  if (type === "session.status_idle") {
    return shouldStopForIdleEvent({ event });
  }
  if (type === "session.status_terminated" || type === "session.deleted") {
    await handleTerminatedManagedSession({ role, reason: type });
  }
  return false;
}

function shouldStopForIdleEvent({ event }: { event: unknown }): boolean {
  const stopReason = jsonModule.record({
    value: jsonModule.record({ value: event }).stop_reason,
  });
  return stopReason.type !== "requires_action";
}

async function handleTerminatedManagedSession({
  role,
  reason,
}: {
  role: ClaudeAgentRole;
  reason: string;
}): Promise<never> {
  if (role !== "scientist") {
    await replaceManagedSession({ role, reason });
  }
  throw new Error(`Managed Agent session ended with event ${reason}.`);
}
