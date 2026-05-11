export const RESEARCH_STATUSES = [
  "triage",
  "accepted",
  "active",
  "in_review",
  "done",
  "canceled",
  "failed",
] as const;

export type ResearchStatus = (typeof RESEARCH_STATUSES)[number];

export const SESSION_STATUSES = ["active", "closed", "failed", "canceled"] as const;

export type SessionStatus = (typeof SESSION_STATUSES)[number];

export const RESEARCH_PROJECT_STATUSES = [
  "active",
  "blocked_on_user",
  "complete",
  "failed",
  "canceled",
] as const;

export type ResearchProjectStatus = (typeof RESEARCH_PROJECT_STATUSES)[number];

export const RESEARCH_PROJECT_INTERACTION_STATUSES = [
  "pending",
  "answered",
  "confirmed",
  "rejected",
  "canceled",
] as const;

export type ResearchProjectInteractionStatus =
  (typeof RESEARCH_PROJECT_INTERACTION_STATUSES)[number];

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

export type ResearchTaskStatus = (typeof RESEARCH_TASK_STATUSES)[number];

export const RESEARCH_TASK_TYPES = [
  "explore",
  "exploit",
  "debug",
  "verify",
  "synthesize",
  "prune",
] as const;

export type ResearchTaskType = (typeof RESEARCH_TASK_TYPES)[number];

export const RESEARCH_TASK_PRIORITIES = ["urgent", "high", "normal", "low"] as const;

export type ResearchTaskPriority = (typeof RESEARCH_TASK_PRIORITIES)[number];

export const RESEARCH_TASK_VERIFICATION_STATUSES = [
  "passed",
  "failed",
  "suspicious",
  "needs_more_evidence",
] as const;

export type ResearchTaskVerificationStatus = (typeof RESEARCH_TASK_VERIFICATION_STATUSES)[number];

export const RESEARCH_TASK_VERIFICATION_PROFILES = [
  "hypothesis",
  "experiment",
  "measurement",
  "adversarial",
  "report",
  "general",
] as const;

export type ResearchTaskVerificationProfile = (typeof RESEARCH_TASK_VERIFICATION_PROFILES)[number];

export const CLAUDE_AGENT_STATUSES = ["idle", "active", "closed"] as const;

export type ClaudeAgentStatus = (typeof CLAUDE_AGENT_STATUSES)[number];

export const CLAUDE_AGENT_RUN_STATUSES = [
  "queued",
  "running",
  "waiting_for_action",
  "complete",
  "failed",
  "canceled",
] as const;

export type ClaudeAgentRunStatus = (typeof CLAUDE_AGENT_RUN_STATUSES)[number];

export const WORK_ITEM_STATUSES = ["pending", "claimed", "done", "failed", "canceled"] as const;

export type WorkItemStatus = (typeof WORK_ITEM_STATUSES)[number];

export const COMPUTE_TARGET_STATUSES = ["idle", "claimed", "draining", "dead"] as const;

export type ComputeTargetStatus = (typeof COMPUTE_TARGET_STATUSES)[number];
