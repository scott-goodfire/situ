import type * as schema from "../../data/db/schema";

export type SessionRow = typeof schema.session.$inferSelect;
export type LocalSettingsRow = typeof schema.localSettings.$inferSelect;
export type ClaudeAgentRow = typeof schema.claudeAgents.$inferSelect;
export type ClaudeAgentEnvironmentRow = typeof schema.claudeAgentEnvironments.$inferSelect;
export type ClaudeAgentRunRow = typeof schema.claudeAgentRuns.$inferSelect;
export type ClaudeAgentEventRow = typeof schema.claudeAgentEvents.$inferSelect;
export type AppEventRow = typeof schema.appEvents.$inferSelect;
export type ResearchProjectRow = typeof schema.researchProjects.$inferSelect;
export type ResearchProjectInteractionRow = typeof schema.researchProjectInteractions.$inferSelect;
export type ResearchTaskRow = typeof schema.researchTasks.$inferSelect;
export type ResearchTaskVerificationRow = typeof schema.researchTaskVerifications.$inferSelect;
export type WorkItemRow = typeof schema.workItems.$inferSelect;
export type HypothesisRow = typeof schema.hypotheses.$inferSelect;
export type ExperimentRow = typeof schema.experiments.$inferSelect;
export type BaselineRow = typeof schema.baselines.$inferSelect;
export type EvaluationRow = typeof schema.evaluations.$inferSelect;
export type MeasurementRow = typeof schema.measurements.$inferSelect;
export type ArtifactRow = typeof schema.artifacts.$inferSelect;
export type EntityLinkRow = typeof schema.entityLinks.$inferSelect;
export type HypothesisActivityRow = typeof schema.hypothesisActivities.$inferSelect;
export type ExperimentActivityRow = typeof schema.experimentActivities.$inferSelect;
export type BaselineActivityRow = typeof schema.baselineActivities.$inferSelect;
export type EvaluationActivityRow = typeof schema.evaluationActivities.$inferSelect;
export type ComputeTargetRow = typeof schema.computeTargets.$inferSelect;

export type ActivityRowBase = {
  id: number;
  actorAgentId: string | null;
  actor: string;
  kind: string;
  body: string;
  payloadJson: string;
  createdAt: string;
};
