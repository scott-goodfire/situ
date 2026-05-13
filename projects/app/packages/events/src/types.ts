import type { ActorRef, IsoTimestamp, TargetRef } from "@situ/common";

export type EventRecord = {
  id: string;
  type: string;
  actor: ActorRef;
  target: TargetRef;
  message: string;
  payload: Record<string, unknown>;
  createdAt: IsoTimestamp;
};
