import type { ActorRef, IsoTimestamp, SyncMetadata, TargetRef } from "@situ/common";

export type EventRecord = SyncMetadata & {
  id: string;
  type: string;
  actor: ActorRef;
  target: TargetRef;
  message: string;
  payload: Record<string, unknown>;
  createdAt: IsoTimestamp;
};
