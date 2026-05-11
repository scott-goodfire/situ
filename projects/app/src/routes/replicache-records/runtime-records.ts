import type {
  AppEventRecord,
  ClaudeAgentEnvironmentRecord,
  ClaudeAgentEventRecord,
  ClaudeAgentRecord,
  ClaudeAgentRunRecord,
  ComputeTargetRecord,
  LocalSettingsRecord,
  RuntimeStatusRecord,
  SessionRecord,
} from "@situ/protocol";
import { payloadRecord } from "./payload-record";
import type {
  AppEventRow,
  ClaudeAgentEnvironmentRow,
  ClaudeAgentEventRow,
  ClaudeAgentRow,
  ClaudeAgentRunRow,
  ComputeTargetRow,
  LocalSettingsRow,
  SessionRow,
} from "./types";

export function sessionRecord({ row }: { row: SessionRow }): SessionRecord {
  return {
    id: row.id,
    title: row.title,
    objective: row.objective,
    repoPath: row.repoPath,
    workspaceKey: row.workspaceKey,
    status: row.status,
    claudeSessionId: row.claudeSessionId,
    claudeEnvironmentId: row.claudeEnvironmentId,
    closedAt: row.closedAt,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
  };
}

export function localSettingsRecord({ row }: { row: LocalSettingsRow }): LocalSettingsRecord {
  return {
    id: row.id,
    anthropicKeyConfigured: row.anthropicKeyConfigured,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
  };
}

export function claudeAgentRecord({ row }: { row: ClaudeAgentRow }): ClaudeAgentRecord {
  return {
    id: row.id,
    kind: row.kind,
    displayName: row.displayName,
    claudeAgentId: row.claudeAgentId,
    claudeAgentVersion: row.claudeAgentVersion,
    claudeSessionId: row.claudeSessionId,
    model: row.model,
    status: row.status,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
  };
}

export function claudeAgentEnvironmentRecord({
  row,
}: {
  row: ClaudeAgentEnvironmentRow;
}): ClaudeAgentEnvironmentRecord {
  return {
    id: row.id,
    claudeEnvironmentId: row.claudeEnvironmentId,
    name: row.name,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
  };
}

export function claudeAgentRunRecord({ row }: { row: ClaudeAgentRunRow }): ClaudeAgentRunRecord {
  return {
    id: row.id,
    agentId: row.agentId,
    workItemId: row.workItemId,
    claudeSessionId: row.claudeSessionId,
    status: row.status,
    attempt: row.attempt,
    lastEventId: row.lastEventId,
    lastEventAt: row.lastEventAt,
    leaseExpiresAt: row.leaseExpiresAt,
    errorMessage: row.errorMessage,
    payload: payloadRecord({ payloadJson: row.payloadJson, label: `claudeAgentRuns/${row.id}` }),
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
  };
}

export function claudeAgentEventRecord({
  row,
}: {
  row: ClaudeAgentEventRow;
}): ClaudeAgentEventRecord {
  return {
    id: row.id,
    agentId: row.agentId,
    claudeEventId: row.claudeEventId,
    type: row.type,
    payload: payloadRecord({ payloadJson: row.payloadJson, label: `claudeAgentEvents/${row.id}` }),
    createdAt: row.createdAt,
  };
}

export function appEventRecord({ row }: { row: AppEventRow }): AppEventRecord {
  return {
    id: row.id,
    type: row.type,
    message: row.message,
    payload: payloadRecord({ payloadJson: row.payloadJson, label: `appEvents/${row.id}` }),
    createdAt: row.createdAt,
  };
}

export function computeTargetRecord({ row }: { row: ComputeTargetRow }): ComputeTargetRecord {
  return {
    id: row.id,
    pool: row.pool,
    kind: row.kind,
    label: row.label,
    status: row.status,
    claimedByResearchTaskId: row.claimedByResearchTaskId,
    claimedAt: row.claimedAt,
    leaseExpiresAt: row.leaseExpiresAt,
    lastHeartbeat: row.lastHeartbeat,
    metadata: payloadRecord({ payloadJson: row.metadataJson, label: `computeTargets/${row.id}` }),
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
  };
}

export function runtimeStatusRecord({
  agent,
  environment,
  session,
}: {
  agent: ClaudeAgentRow | null;
  environment: ClaudeAgentEnvironmentRow | null;
  session: SessionRow | null;
}): RuntimeStatusRecord {
  return {
    agent: agent ? claudeAgentRecord({ row: agent }) : null,
    environment: environment ? claudeAgentEnvironmentRecord({ row: environment }) : null,
    session: session ? sessionRecord({ row: session }) : null,
  };
}
