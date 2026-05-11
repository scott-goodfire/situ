import type {
  ClaudeAgentRunStatus,
  ClaudeAgentStatus,
  ComputeTargetStatus,
  ResearchProjectInteractionStatus,
  ResearchProjectStatus,
  ResearchStatus,
  ResearchTaskPriority,
  ResearchTaskStatus,
  ResearchTaskType,
  ResearchTaskVerificationProfile,
  ResearchTaskVerificationStatus,
  SessionStatus,
  WorkItemStatus,
} from "./status";
import type { Timestamp } from "./timestamp";

export type ProtocolPayload = Record<string, unknown>;

export type SessionRecord = {
  id: string;
  title: string;
  objective: string;
  repoPath: string;
  workspaceKey: string;
  status: SessionStatus;
  claudeSessionId: string | null;
  claudeEnvironmentId: string | null;
  closedAt: Timestamp | null;
  createdAt: Timestamp;
  updatedAt: Timestamp;
};

export type LocalSettingsRecord = {
  id: string;
  anthropicKeyConfigured: boolean;
  createdAt: Timestamp;
  updatedAt: Timestamp;
};

export type ClaudeAgentKind = "manager" | "scientist" | "verifier" | "scribe" | "reporter";

export type ClaudeAgentRecord = {
  id: string;
  kind: ClaudeAgentKind;
  displayName: string;
  claudeAgentId: string | null;
  claudeAgentVersion: number | null;
  claudeSessionId: string | null;
  model: string | null;
  status: ClaudeAgentStatus;
  createdAt: Timestamp;
  updatedAt: Timestamp;
};

export type ClaudeAgentEnvironmentRecord = {
  id: string;
  claudeEnvironmentId: string;
  name: string;
  createdAt: Timestamp;
  updatedAt: Timestamp;
};

export type ClaudeAgentRunRecord = {
  id: string;
  agentId: string | null;
  workItemId: string | null;
  claudeSessionId: string | null;
  status: ClaudeAgentRunStatus;
  attempt: number;
  lastEventId: string | null;
  lastEventAt: Timestamp | null;
  leaseExpiresAt: Timestamp | null;
  errorMessage: string | null;
  payload: ProtocolPayload;
  createdAt: Timestamp;
  updatedAt: Timestamp;
};

export type ClaudeAgentEventRecord = {
  id: string;
  agentId: string | null;
  claudeEventId: string | null;
  type: string;
  payload: ProtocolPayload;
  createdAt: Timestamp;
};

export type ResearchProjectPhase = "onboarding" | "baseline" | "search" | "reporting" | "complete";

export type ResearchProjectRecord = {
  id: string;
  goal: string;
  phase: ResearchProjectPhase;
  status: ResearchProjectStatus;
  baselineSummary: string | null;
  resultSummary: string | null;
  createdByAgentId: string | null;
  startedAt: Timestamp | null;
  completedAt: Timestamp | null;
  payload: ProtocolPayload;
  createdAt: Timestamp;
  updatedAt: Timestamp;
};

export type FeedEntrySeverity = "info" | "progress" | "stuck" | "failure";

export type FeedEntryRecord = {
  id: string;
  researchProjectId: string;
  summaryMarkdown: string;
  severity: FeedEntrySeverity;
  citedAppEventIds: string[];
  windowStartedAt: Timestamp;
  windowEndedAt: Timestamp;
  createdByAgentId: string | null;
  createdAt: Timestamp;
  updatedAt: Timestamp;
};

export type ResearchProjectInteractionKind = "question" | "baseline_confirmation";

export type ResearchProjectInteractionRecord = {
  id: string;
  researchProjectId: string;
  kind: ResearchProjectInteractionKind;
  prompt: string;
  details: string;
  status: ResearchProjectInteractionStatus;
  response: string | null;
  createdByAgentId: string | null;
  resolvedAt: Timestamp | null;
  payload: ProtocolPayload;
  createdAt: Timestamp;
  updatedAt: Timestamp;
};

export type ResearchTaskRecord = {
  id: string;
  researchProjectId: string;
  parentResearchTaskId: string | null;
  type: ResearchTaskType;
  status: ResearchTaskStatus;
  priority: ResearchTaskPriority;
  title: string;
  workerPrompt: string;
  verificationPrompt: string;
  resultSummary: string | null;
  targetKind: string | null;
  targetId: string | null;
  createdByAgentId: string | null;
  startedAt: Timestamp | null;
  completedAt: Timestamp | null;
  payload: ProtocolPayload;
  createdAt: Timestamp;
  updatedAt: Timestamp;
};

export type ResearchTaskVerificationRecord = {
  id: string;
  researchTaskId: string;
  profile: ResearchTaskVerificationProfile;
  status: ResearchTaskVerificationStatus;
  verifierPrompt: string;
  judgment: string;
  evidenceSummary: string;
  createdByAgentId: string | null;
  payload: ProtocolPayload;
  createdAt: Timestamp;
  updatedAt: Timestamp;
};

export type WorkItemRecord = {
  id: string;
  purpose: string;
  targetKind: string;
  targetId: string;
  status: WorkItemStatus;
  ownerAgentId: string | null;
  ownerWorkflowId: string | null;
  attempt: number;
  availableAt: Timestamp;
  claimedAt: Timestamp | null;
  leaseExpiresAt: Timestamp | null;
  completedAt: Timestamp | null;
  payload: ProtocolPayload;
  createdAt: Timestamp;
  updatedAt: Timestamp;
};

export type HypothesisRecord = {
  id: string;
  createdByResearchTaskId: string | null;
  createdByAgentId: string | null;
  title: string;
  summary: string;
  status: ResearchStatus;
  createdAt: Timestamp;
  updatedAt: Timestamp;
};

export type ExperimentRecord = {
  id: string;
  createdByResearchTaskId: string | null;
  createdByAgentId: string | null;
  associatedHypothesisId: string;
  parentExperimentId: string | null;
  title: string;
  summary: string;
  status: ResearchStatus;
  worktreePath: string | null;
  baseCommit: string | null;
  candidateCommit: string | null;
  createdAt: Timestamp;
  updatedAt: Timestamp;
};

export type BaselineRecord = {
  id: string;
  researchProjectId: string;
  createdByResearchTaskId: string | null;
  createdByAgentId: string | null;
  title: string;
  summary: string;
  status: ResearchStatus;
  payload: ProtocolPayload;
  createdAt: Timestamp;
  updatedAt: Timestamp;
};

export type EvaluationRecord = {
  id: string;
  createdByResearchTaskId: string | null;
  createdByAgentId: string | null;
  associatedBaselineId: string | null;
  associatedExperimentId: string | null;
  title: string;
  summary: string;
  status: ResearchStatus;
  createdAt: Timestamp;
  updatedAt: Timestamp;
};

export type MeasurementRecord = {
  id: string;
  createdByResearchTaskId: string | null;
  createdByAgentId: string | null;
  evaluationId: string;
  actor: string;
  body: string;
  payload: ProtocolPayload;
  createdAt: Timestamp;
};

export type ArtifactRecord = {
  id: string;
  createdByResearchTaskId: string | null;
  createdByAgentId: string | null;
  entityKind: string;
  entityId: string;
  kind: string;
  title: string;
  body: string;
  path: string;
  mediaType: string | null;
  sizeBytes: number | null;
  createdAt: Timestamp;
};

export type EntityLinkRecord = {
  id: string;
  fromKind: string;
  fromId: string;
  toKind: string;
  toId: string;
  relationship: string;
  createdAt: Timestamp;
};

export type AppEventRecord = {
  id: number;
  type: string;
  message: string;
  payload: ProtocolPayload;
  createdAt: Timestamp;
};

export type ComputeTargetRecord = {
  id: string;
  pool: string;
  kind: string;
  label: string | null;
  status: ComputeTargetStatus;
  claimedByResearchTaskId: string | null;
  claimedAt: Timestamp | null;
  leaseExpiresAt: Timestamp | null;
  lastHeartbeat: Timestamp | null;
  metadata: ProtocolPayload;
  createdAt: Timestamp;
  updatedAt: Timestamp;
};
