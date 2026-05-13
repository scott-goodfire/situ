import type { CommentRecord } from "../types";

export type CommentRepository = {
  get(id: string): Promise<CommentRecord | undefined>;
  listByTarget(targetId: string): Promise<CommentRecord[]>;
};
