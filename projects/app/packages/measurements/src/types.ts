import type { ActorRef, IsoTimestamp, TargetRef } from "@situ/common";

export type MeasurementRecord = {
  id: string;
  projectId: string;
  target: TargetRef;
  name: string;
  value: Record<string, unknown>;
  unit?: string;
  summaryMarkdown: string;
  observedCommit?: string;
  measuredBy: ActorRef;
  createdAt: IsoTimestamp;
};
