import type { IsoTimestamp, SyncMetadata } from "@situ/common";

export const PROJECT_STATUSES = ["active", "paused", "blocked", "complete", "archived"] as const;

export type ProjectStatus = (typeof PROJECT_STATUSES)[number];

export type ProjectRecord = SyncMetadata & {
  id: string;
  goalMarkdown: string;
  status: ProjectStatus;
  currentBaselineSummary: string;
  currentAnswerSummary: string;
  confidenceSummary: string;
  blockersSummary: string;
  openQuestionsSummary: string;
  progressCheckpointsSummary: string;
  finalResultSummary: string;
  createdAt: IsoTimestamp;
  updatedAt: IsoTimestamp;
};
