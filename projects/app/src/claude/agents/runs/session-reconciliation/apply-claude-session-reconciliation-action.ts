import { recordAppEvent } from "../../../../app-events";
import { replaceManagedSession } from "../../resources";
import {
  claudeSessionReconciliationErrorMessage,
  ClaudeSessionReconciliationActionKind,
  type ClaudeSessionReconciliationAction,
} from "./claude-session-reconciliation-action";
import { failRunningRunsForSession } from "./fail-running-runs-for-session";
import { markClaudeAgentsActive, markClaudeAgentsIdle } from "./mark-claude-agents-status";

export async function applyClaudeSessionReconciliationAction({
  action,
}: {
  action: ClaudeSessionReconciliationAction;
}): Promise<void> {
  if (action.kind === ClaudeSessionReconciliationActionKind.MarkAgentsActive) {
    await markClaudeAgentsActive();
    return;
  }
  if (action.kind === ClaudeSessionReconciliationActionKind.MarkAgentsIdle) {
    await markClaudeAgentsIdle();
    return;
  }
  if (action.kind === ClaudeSessionReconciliationActionKind.ReplaceTerminatedSession) {
    await replaceTerminatedSession({ oldClaudeSessionId: action.oldClaudeSessionId });
    return;
  }
  if (action.kind === ClaudeSessionReconciliationActionKind.ReplaceUnreachableSession) {
    await replaceUnreachableSession({
      error: action.error,
      oldClaudeSessionId: action.oldClaudeSessionId,
    });
    return;
  }
  if (action.kind === ClaudeSessionReconciliationActionKind.ReplaceStalledSession) {
    await replaceStalledSession({
      oldClaudeSessionId: action.oldClaudeSessionId,
      exhaustedCount: action.exhaustedCount,
    });
    return;
  }
  if (action.kind === ClaudeSessionReconciliationActionKind.RecordSupervisorError) {
    await recordSupervisorError({
      error: action.error,
      oldClaudeSessionId: action.oldClaudeSessionId,
    });
  }
}

async function replaceTerminatedSession({
  oldClaudeSessionId,
}: {
  oldClaudeSessionId: string;
}): Promise<void> {
  await replaceManagedSession({ reason: "remote session terminated" });
  await failRunningRunsForSession({
    claudeSessionId: oldClaudeSessionId,
    message: "Claude managed session terminated.",
  });
  await recordAppEvent({
    type: "claude.session_replaced",
    message: "Replaced terminated Claude managed session.",
    payload: { oldClaudeSessionId },
  });
}

async function replaceUnreachableSession({
  error,
  oldClaudeSessionId,
}: {
  error: unknown;
  oldClaudeSessionId: string;
}): Promise<void> {
  await replaceManagedSession({ reason: "remote session retrieve failed" });
  await recordAppEvent({
    type: "claude.session_replaced",
    message: "Replaced unreachable Claude managed session.",
    payload: {
      oldClaudeSessionId,
      error: claudeSessionReconciliationErrorMessage({ error }),
    },
  });
}

async function replaceStalledSession({
  oldClaudeSessionId,
  exhaustedCount,
}: {
  oldClaudeSessionId: string;
  exhaustedCount: number;
}): Promise<void> {
  await replaceManagedSession({
    reason: `${exhaustedCount} consecutive retries_exhausted`,
  });
  await failRunningRunsForSession({
    claudeSessionId: oldClaudeSessionId,
    message: "Claude managed session swapped after stalled retries.",
  });
  await recordAppEvent({
    type: "claude.session_replaced",
    message: "Replaced stalled Claude managed session.",
    payload: {
      oldClaudeSessionId,
      reason: "retries_exhausted_threshold",
      exhaustedCount,
    },
  });
}

async function recordSupervisorError({
  error,
  oldClaudeSessionId,
}: {
  error: unknown;
  oldClaudeSessionId: string;
}): Promise<void> {
  await recordAppEvent({
    type: "claude.session_supervisor_error",
    message: "Claude managed session supervisor could not read remote state.",
    payload: {
      claudeSessionId: oldClaudeSessionId,
      error: claudeSessionReconciliationErrorMessage({ error }),
    },
  });
}
