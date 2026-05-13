import type { ActorRef, IsoTimestamp, SyncMetadata, TargetRef } from "@situ/common";

export const REVIEW_STATUSES = [
  "approved",
  "changes_requested",
  "needs_more_evidence",
  "rejected",
  "commented",
] as const;

export type ReviewStatus = (typeof REVIEW_STATUSES)[number];

export type ReviewRecord = SyncMetadata & {
  id: string;
  projectId: string;
  target: TargetRef;
  reviewer: ActorRef;
  status: ReviewStatus;
  rationaleMarkdown: string;
  reviewedCommit?: string;
  citedMeasurementIds: string[];
  citedArtifactIds: string[];
  createdAt: IsoTimestamp;
  updatedAt: IsoTimestamp;
};
