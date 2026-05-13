import { eq } from "drizzle-orm";
import type { BunSQLiteDatabase } from "drizzle-orm/bun-sqlite";

import { comments, type CommentRow, type NewCommentRow } from "../schema";
import type { CommentRecord } from "../types";

export type CreateCommentRepositoryInput = {
  db: BunSQLiteDatabase<Record<string, unknown>>;
};

export type CommentByIdInput = {
  id: string;
};

export type CommentsByTargetInput = {
  targetId: string;
};

export type CommentWriteInput = {
  comment: CommentRecord;
};

export type CommentRepository = {
  create(input: CommentWriteInput): CommentRecord;
  get(input: CommentByIdInput): CommentRecord | undefined;
  listByTarget(input: CommentsByTargetInput): CommentRecord[];
};

type CommentRecordInput = {
  comment: CommentRecord;
};

type CommentRowInput = {
  row: CommentRow;
};

const encodeComment = ({ comment }: CommentRecordInput): NewCommentRow => ({
  id: comment.id,
  targetKind: comment.target.targetKind,
  targetId: comment.target.targetId,
  authorActorKind: comment.author.actorKind,
  authorActorId: comment.author.actorId,
  bodyMarkdown: comment.bodyMarkdown,
  citedTargetsJson: JSON.stringify(comment.citedTargets),
  createdAt: comment.createdAt,
  updatedAt: comment.updatedAt,
});

const decodeComment = ({ row }: CommentRowInput): CommentRecord => ({
  id: row.id,
  target: {
    targetKind: row.targetKind,
    targetId: row.targetId,
  },
  author: {
    actorKind: row.authorActorKind,
    actorId: row.authorActorId,
  },
  bodyMarkdown: row.bodyMarkdown,
  citedTargets: JSON.parse(row.citedTargetsJson) as CommentRecord["citedTargets"],
  createdAt: row.createdAt,
  updatedAt: row.updatedAt,
});

/** Creates the repository for comment persistence. */
export const createCommentRepository = ({
  db,
}: CreateCommentRepositoryInput): CommentRepository => ({
  create({ comment }) {
    db.insert(comments).values(encodeComment({ comment })).run();
    return comment;
  },

  get({ id }) {
    const row = db.select().from(comments).where(eq(comments.id, id)).get();

    if (row === undefined) {
      return undefined;
    }

    return decodeComment({ row });
  },

  listByTarget({ targetId }) {
    return db
      .select()
      .from(comments)
      .where(eq(comments.targetId, targetId))
      .all()
      .map((row) => decodeComment({ row }));
  },
});
