import { createSyncMetadata } from "@situ/common";
import type { ReviewRecord } from "@situ/reviews";

import { ensureActorExists, resolveActionActor } from "./actors";
import { addComment } from "./comments";
import { recordEvent } from "./events";
import { createNotification } from "./notifications";
import type { AppRepositories } from "./repositories";
import { ensureTargetExists, targetForReview } from "./targets";
import type { Clock, CreateReviewInput, IdFactory } from "./types";

export type CreateReviewActionInput = {
  createId: IdFactory;
  input: CreateReviewInput;
  now: Clock;
  repositories: AppRepositories;
};

const notificationTypeForReview = ({
  status,
}: Pick<CreateReviewInput, "status">): "changes_requested" | "review_requested" => {
  if (status === "changes_requested" || status === "needs_more_evidence") {
    return "changes_requested";
  }

  return "review_requested";
};

/**
 * Creates a review.
 */
export const createReviewAction = ({
  createId,
  input,
  now,
  repositories,
}: CreateReviewActionInput): ReviewRecord => {
  const actor = resolveActionActor({
    actor: input.actor,
    repositories,
  });
  const timestamp = now();

  repositories.projects.require({ id: input.projectId });
  ensureTargetExists({
    repositories,
    target: input.target,
  });

  for (const measurementId of input.citedMeasurementIds ?? []) {
    repositories.measurements.require({ id: measurementId });
  }

  for (const artifactId of input.citedArtifactIds ?? []) {
    repositories.artifacts.require({ id: artifactId });
  }

  if (input.notifyActor !== undefined) {
    ensureActorExists({
      actor: input.notifyActor,
      repositories,
    });
  }

  const review = repositories.reviews.create({
    review: {
      citedArtifactIds: input.citedArtifactIds ?? [],
      citedMeasurementIds: input.citedMeasurementIds ?? [],
      createdAt: timestamp,
      id: input.id ?? createId("review"),
      projectId: input.projectId,
      rationaleMarkdown: input.rationaleMarkdown,
      reviewedCommit: input.reviewedCommit,
      reviewer: actor,
      status: input.status,
      ...createSyncMetadata(),
      target: input.target,
      updatedAt: timestamp,
    },
  });

  recordEvent({
    createId,
    event: {
      actor,
      message: "Review created",
      payload: {
        reviewId: review.id,
        reviewedCommit: review.reviewedCommit,
        status: review.status,
      },
      target: targetForReview({ review }),
      type: "review.created",
    },
    now,
    repositories,
  });

  if (input.commentMarkdown !== undefined) {
    addComment({
      createId,
      input: {
        actor,
        bodyMarkdown: input.commentMarkdown,
        target: targetForReview({ review }),
      },
      now,
      repositories,
    });
  }

  if (input.notifyActor !== undefined) {
    createNotification({
      createId,
      notification: {
        bodyMarkdown: input.rationaleMarkdown,
        recipient: input.notifyActor,
        target: targetForReview({ review }),
        title: `Review ${review.status}`,
        type: notificationTypeForReview({
          status: review.status,
        }),
      },
      now,
      repositories,
    });
  }

  return review;
};
