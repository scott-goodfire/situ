import type { IsoTimestamp, SyncMetadata } from "@situ/common";

export const EXPERIMENT_STATUSES = [
  "active",
  "in_review",
  "accepted",
  "rejected",
  "abandoned",
] as const;

export type ExperimentStatus = (typeof EXPERIMENT_STATUSES)[number];

export type ExperimentRecord = SyncMetadata & {
  id: string;
  projectId: string;
  taskId?: string;
  parentExperimentId?: string;
  title: string;
  summaryMarkdown: string;
  worktreePath: string;
  baseCommit: string;
  currentCandidateCommit: string;
  status: ExperimentStatus;
  createdAt: IsoTimestamp;
  updatedAt: IsoTimestamp;
};
