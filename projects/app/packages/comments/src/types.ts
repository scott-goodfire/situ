import type { ActorRef, IsoTimestamp, TargetRef } from "@situ/common";

export type CommentRecord = {
  id: string;
  target: TargetRef;
  author: ActorRef;
  bodyMarkdown: string;
  citedTargets: TargetRef[];
  createdAt: IsoTimestamp;
  updatedAt: IsoTimestamp;
};
