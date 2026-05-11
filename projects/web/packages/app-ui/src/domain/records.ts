import type { Timestamp } from "@situ/protocol";

export type {
  ResearchStatus,
  Timestamp,
  LocalSettingsRecord,
  HypothesisRecord,
  ExperimentRecord,
  BaselineRecord,
  EvaluationRecord,
  ClaudeAgentKind,
  ClaudeAgentStatus,
  ClaudeAgentRecord,
  WorkItemStatus,
  WorkItemRecord,
  AppEventRecord,
  ArtifactRecord,
  MeasurementRecord,
  EntityLinkRecord,
} from "@situ/protocol";
export { RESEARCH_STATUSES } from "@situ/protocol";

export type ResearchProjectStatus =
  | "draft"
  | "onboarding"
  | "researching"
  | "verifying"
  | "reporting"
  | "complete"
  | "blocked"
  | "failed"
  | "canceled";

export type ResearchProjectRecord = {
  id: string;
  title: string;
  goal: string;
  status: ResearchProjectStatus;
  baselineSummary: string | null;
  currentDecision: string | null;
  reportSummary: string | null;
  createdAt: Timestamp;
  updatedAt: Timestamp;
};

export type ResearchProjectInteractionKind = "question" | "baseline_confirmation" | "decision";

export type ResearchProjectInteractionStatus =
  | "pending"
  | "answered"
  | "confirmed"
  | "rejected"
  | "canceled";

export type ResearchProjectInteractionRecord = {
  id: string;
  projectId: string;
  kind: ResearchProjectInteractionKind;
  prompt: string;
  details: string | null;
  status: ResearchProjectInteractionStatus;
  response: string | null;
  createdAt: Timestamp;
  updatedAt: Timestamp;
};

export type ResearchTaskType = "explore" | "exploit" | "debug" | "verify" | "synthesize" | "prune";

export type ResearchTaskStatus =
  | "planned"
  | "running"
  | "worker_complete"
  | "verifying"
  | "verified"
  | "rejected"
  | "needs_more_evidence"
  | "pruned"
  | "failed";

export type ResearchTaskPriority = "urgent" | "high" | "normal" | "low";

export type ResearchTaskRecord = {
  id: string;
  projectId: string;
  parentResearchTaskId: string | null;
  type: ResearchTaskType;
  title: string;
  summary: string;
  workerPrompt: string;
  verificationPrompt: string;
  status: ResearchTaskStatus;
  priority: ResearchTaskPriority;
  hypothesisId: string | null;
  evidenceCount: number;
  createdAt: Timestamp;
  updatedAt: Timestamp;
};

export type ResearchTaskVerificationStatus =
  | "pending"
  | "pass"
  | "fail"
  | "suspicious"
  | "needs_more_evidence";

export type ResearchTaskVerificationRecord = {
  id: string;
  researchTaskId: string;
  status: ResearchTaskVerificationStatus;
  verifier: string;
  summary: string;
  evidence: string[];
  createdAt: Timestamp;
  updatedAt: Timestamp;
};
