import type {
  FeedEntryRecord,
  FeedEntrySeverity,
  ResearchProjectInteractionRecord,
  ResearchProjectRecord,
  ResearchTaskRecord,
  ResearchTaskVerificationRecord,
  WorkItemRecord,
} from "@situ/protocol";
import { payloadRecord } from "./payload-record";
import type {
  FeedEntryRow,
  ResearchProjectInteractionRow,
  ResearchProjectRow,
  ResearchTaskRow,
  ResearchTaskVerificationRow,
  WorkItemRow,
} from "./types";

export function feedEntryRecord({ row }: { row: FeedEntryRow }): FeedEntryRecord {
  return {
    id: row.id,
    researchProjectId: row.researchProjectId,
    summaryMarkdown: row.summaryMarkdown,
    severity: row.severity as FeedEntrySeverity,
    citedAppEventIds: parseCitedAppEventIds({
      raw: row.citedAppEventIdsJson,
      label: `feedEntries/${row.id}`,
    }),
    windowStartedAt: row.windowStartedAt,
    windowEndedAt: row.windowEndedAt,
    createdByAgentId: row.createdByAgentId,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
  };
}

function parseCitedAppEventIds({ raw, label }: { raw: string; label: string }): string[] {
  try {
    const value = JSON.parse(raw);
    if (Array.isArray(value) && value.every((item) => typeof item === "string")) {
      return value;
    }
  } catch {
    // fall through
  }
  console.warn(`Invalid citedAppEventIdsJson for ${label}; defaulting to [].`);
  return [];
}

export function researchProjectRecord({ row }: { row: ResearchProjectRow }): ResearchProjectRecord {
  return {
    id: row.id,
    goal: row.goal,
    phase: row.phase,
    status: row.status,
    baselineSummary: row.baselineSummary,
    resultSummary: row.resultSummary,
    createdByAgentId: row.createdByAgentId,
    startedAt: row.startedAt,
    completedAt: row.completedAt,
    payload: payloadRecord({ payloadJson: row.payloadJson, label: `researchProjects/${row.id}` }),
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
  };
}

export function researchProjectInteractionRecord({
  row,
}: {
  row: ResearchProjectInteractionRow;
}): ResearchProjectInteractionRecord {
  return {
    id: row.id,
    researchProjectId: row.researchProjectId,
    kind: row.kind,
    prompt: row.prompt,
    details: row.details,
    status: row.status,
    response: row.response,
    createdByAgentId: row.createdByAgentId,
    resolvedAt: row.resolvedAt,
    payload: payloadRecord({
      payloadJson: row.payloadJson,
      label: `researchProjectInteractions/${row.id}`,
    }),
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
  };
}

export function researchTaskRecord({ row }: { row: ResearchTaskRow }): ResearchTaskRecord {
  return {
    id: row.id,
    researchProjectId: row.researchProjectId,
    parentResearchTaskId: row.parentResearchTaskId,
    type: row.type,
    status: row.status,
    priority: row.priority,
    title: row.title,
    workerPrompt: row.workerPrompt,
    verificationPrompt: row.verificationPrompt,
    resultSummary: row.resultSummary,
    targetKind: row.targetKind,
    targetId: row.targetId,
    createdByAgentId: row.createdByAgentId,
    startedAt: row.startedAt,
    completedAt: row.completedAt,
    payload: payloadRecord({ payloadJson: row.payloadJson, label: `researchTasks/${row.id}` }),
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
  };
}

export function researchTaskVerificationRecord({
  row,
}: {
  row: ResearchTaskVerificationRow;
}): ResearchTaskVerificationRecord {
  return {
    id: row.id,
    researchTaskId: row.researchTaskId,
    profile: row.profile,
    status: row.status,
    verifierPrompt: row.verifierPrompt,
    judgment: row.judgment,
    evidenceSummary: row.evidenceSummary,
    createdByAgentId: row.createdByAgentId,
    payload: payloadRecord({
      payloadJson: row.payloadJson,
      label: `researchTaskVerifications/${row.id}`,
    }),
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
  };
}

export function workItemRecord({ row }: { row: WorkItemRow }): WorkItemRecord {
  return {
    id: row.id,
    purpose: row.purpose,
    targetKind: row.targetKind,
    targetId: row.targetId,
    status: row.status,
    ownerAgentId: row.ownerAgentId,
    ownerWorkflowId: row.ownerWorkflowId,
    attempt: row.attempt,
    availableAt: row.availableAt,
    claimedAt: row.claimedAt,
    leaseExpiresAt: row.leaseExpiresAt,
    completedAt: row.completedAt,
    payload: payloadRecord({ payloadJson: row.payloadJson, label: `workItems/${row.id}` }),
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
  };
}
