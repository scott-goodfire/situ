import { createSyncMetadata } from "@situ/common";
import type { CommentRecord } from "@situ/comments";

import { resolveActionActor } from "./actors";
import { recordEvent } from "./events";
import type { AppRepositories } from "./repositories";
import { ensureTargetExists, updateTargetActivity } from "./targets";
import type { Clock, CreateCommentInput, IdFactory } from "./types";

export type AddCommentInput = {
  createId: IdFactory;
  input: CreateCommentInput;
  now: Clock;
  repositories: AppRepositories;
};

/**
 * Creates a comment.
 */
export const addComment = ({
  createId,
  input,
  now,
  repositories,
}: AddCommentInput): CommentRecord => {
  const actor = resolveActionActor({
    actor: input.actor,
    repositories,
  });
  const timestamp = now();

  ensureTargetExists({
    repositories,
    target: input.target,
  });

  const comment = repositories.comments.create({
    comment: {
      author: actor,
      bodyMarkdown: input.bodyMarkdown,
      citedTargets: input.citedTargets ?? [],
      createdAt: timestamp,
      id: input.id ?? createId("comment"),
      ...createSyncMetadata(),
      target: input.target,
      updatedAt: timestamp,
    },
  });

  updateTargetActivity({
    repositories,
    target: input.target,
    timestamp,
  });

  recordEvent({
    createId,
    event: {
      actor,
      message: "Comment created",
      payload: {
        commentId: comment.id,
      },
      target: input.target,
      type: "comment.created",
    },
    now,
    repositories,
  });

  return comment;
};
