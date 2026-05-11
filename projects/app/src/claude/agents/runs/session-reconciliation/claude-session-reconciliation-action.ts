import { jsonModule } from "../../../../modules/json";

export enum ClaudeSessionReconciliationActionKind {
  MarkAgentsActive = "mark_agents_active",
  MarkAgentsIdle = "mark_agents_idle",
  None = "none",
  RecordSupervisorError = "record_supervisor_error",
  ReplaceStalledSession = "replace_stalled_session",
  ReplaceTerminatedSession = "replace_terminated_session",
  ReplaceUnreachableSession = "replace_unreachable_session",
}

enum ClaudeRemoteSessionStatus {
  Idle = "idle",
  Rescheduling = "rescheduling",
  Running = "running",
  Terminated = "terminated",
}

export type ClaudeSessionReconciliationAction =
  | { kind: ClaudeSessionReconciliationActionKind.MarkAgentsActive }
  | { kind: ClaudeSessionReconciliationActionKind.MarkAgentsIdle }
  | { kind: ClaudeSessionReconciliationActionKind.None }
  | {
      error: unknown;
      kind: ClaudeSessionReconciliationActionKind.RecordSupervisorError;
      oldClaudeSessionId: string;
    }
  | {
      kind: ClaudeSessionReconciliationActionKind.ReplaceStalledSession;
      oldClaudeSessionId: string;
      exhaustedCount: number;
    }
  | {
      kind: ClaudeSessionReconciliationActionKind.ReplaceTerminatedSession;
      oldClaudeSessionId: string;
    }
  | {
      error: unknown;
      kind: ClaudeSessionReconciliationActionKind.ReplaceUnreachableSession;
      oldClaudeSessionId: string;
    };

export function claudeSessionReconciliationAction({
  claudeSessionId,
  status,
}: {
  claudeSessionId: string;
  status: string;
}): ClaudeSessionReconciliationAction {
  if (status === ClaudeRemoteSessionStatus.Running) {
    return { kind: ClaudeSessionReconciliationActionKind.MarkAgentsActive };
  }
  if (status === ClaudeRemoteSessionStatus.Rescheduling) {
    return { kind: ClaudeSessionReconciliationActionKind.MarkAgentsActive };
  }
  if (status === ClaudeRemoteSessionStatus.Idle) {
    return { kind: ClaudeSessionReconciliationActionKind.MarkAgentsIdle };
  }
  if (status === ClaudeRemoteSessionStatus.Terminated) {
    return {
      kind: ClaudeSessionReconciliationActionKind.ReplaceTerminatedSession,
      oldClaudeSessionId: claudeSessionId,
    };
  }
  return { kind: ClaudeSessionReconciliationActionKind.None };
}

export function claudeSessionReplaceStalledAction({
  claudeSessionId,
  exhaustedCount,
}: {
  claudeSessionId: string;
  exhaustedCount: number;
}): ClaudeSessionReconciliationAction {
  return {
    kind: ClaudeSessionReconciliationActionKind.ReplaceStalledSession,
    oldClaudeSessionId: claudeSessionId,
    exhaustedCount,
  };
}

export function claudeSessionRetrieveErrorAction({
  claudeSessionId,
  error,
}: {
  claudeSessionId: string;
  error: unknown;
}): ClaudeSessionReconciliationAction {
  if (isNotFoundError({ error })) {
    return {
      error,
      kind: ClaudeSessionReconciliationActionKind.ReplaceUnreachableSession,
      oldClaudeSessionId: claudeSessionId,
    };
  }
  return {
    error,
    kind: ClaudeSessionReconciliationActionKind.RecordSupervisorError,
    oldClaudeSessionId: claudeSessionId,
  };
}

export function claudeSessionReconciliationErrorMessage({ error }: { error: unknown }): string {
  return error instanceof Error ? error.message : String(error);
}

function isNotFoundError({ error }: { error: unknown }): boolean {
  const record = jsonModule.record({ value: error });
  return record.status === 404 || record.statusCode === 404;
}
