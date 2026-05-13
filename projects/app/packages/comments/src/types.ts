import type { ActorRef, IsoTimestamp, SyncMetadata, TargetRef } from "@situ/common";

export type CommentRecord = SyncMetadata & {
  id: string;
  target: TargetRef;
  author: ActorRef;
  bodyMarkdown: string;
  citedTargets: TargetRef[];
  createdAt: IsoTimestamp;
  updatedAt: IsoTimestamp;
};
