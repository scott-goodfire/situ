import type { ActorRef, IsoTimestamp, TargetRef } from "@situ/common";

export const ARTIFACT_TYPES = ["log", "report", "patch", "chart", "dataset", "note"] as const;

export type ArtifactType = (typeof ARTIFACT_TYPES)[number];

export type ArtifactRecord = {
  id: string;
  projectId: string;
  target: TargetRef;
  type: ArtifactType;
  title: string;
  uri: string;
  mediaType?: string;
  summaryMarkdown: string;
  taskId?: string;
  experimentId?: string;
  sourceCommit?: string;
  createdBy: ActorRef;
  createdAt: IsoTimestamp;
  updatedAt: IsoTimestamp;
};
