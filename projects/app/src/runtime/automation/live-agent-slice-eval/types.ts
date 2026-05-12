import type {
  ResearchTaskPriority,
  ResearchTaskStatus,
  ResearchTaskType,
} from "@situ/research-projects";
import type {
  ResearchTaskVerificationProfile,
  ResearchTaskVerificationStatus,
} from "@situ/research-projects";
import type { AutomationState } from "../runner";

export const DRIVERS = ["manager_turn", "scientist_verifier", "verifier_turn"] as const;
export const PROJECT_PHASES = [
  "onboarding",
  "baseline",
  "search",
  "reporting",
  "complete",
] as const;
export const RESEARCH_TASK_TYPES = [
  "explore",
  "exploit",
  "debug",
  "verify",
  "synthesize",
  "prune",
] as const;
export const RESEARCH_TASK_PRIORITIES = ["urgent", "high", "normal", "low"] as const;
export const RESEARCH_TASK_STATUSES = [
  "planned",
  "running",
  "awaiting_verification",
  "verified",
  "rejected",
  "pruned",
  "failed",
  "canceled",
] as const;
export const VERIFICATION_STATUSES = [
  "passed",
  "failed",
  "suspicious",
  "needs_more_evidence",
] as const;
export const VERIFICATION_PROFILES = [
  "hypothesis",
  "experiment",
  "measurement",
  "adversarial",
  "report",
  "general",
] as const;

export type LiveAgentSliceDriver = (typeof DRIVERS)[number];
export type ResearchProjectPhase = (typeof PROJECT_PHASES)[number];

export type SeedVerificationConfig = Readonly<{
  status: ResearchTaskVerificationStatus;
  profile: ResearchTaskVerificationProfile;
  judgment: string;
  evidenceSummary: string;
  signals?: Readonly<Record<string, unknown>>;
}>;

export type SeedResearchTaskConfig = Readonly<{
  title: string;
  type: ResearchTaskType;
  priority: ResearchTaskPriority;
  workerPrompt: string;
  verificationPrompt: string;
  targetKind?: string;
  targetId?: string;
  status?: ResearchTaskStatus;
  resultSummary?: string;
  verification?: SeedVerificationConfig;
}>;

export type LiveAgentSliceEvalConfig = Readonly<{
  driver: LiveAgentSliceDriver;
  goal: string;
  timeoutSeconds: number;
  projectPhase: ResearchProjectPhase;
  baselineSummary?: string;
  title?: string;
  type: ResearchTaskType;
  priority: ResearchTaskPriority;
  workerPrompt?: string;
  verificationPrompt?: string;
  workerSummary?: string;
  targetKind?: string;
  targetId?: string;
  seedResearchTasks: SeedResearchTaskConfig[];
}>;

export type LiveAgentSliceSummary = Readonly<{
  driver: LiveAgentSliceDriver;
  allowActiveResearchTasks: boolean;
  state: AutomationState;
}>;
