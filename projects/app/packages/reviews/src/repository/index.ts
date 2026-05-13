import { eq } from "drizzle-orm";
import type { BunSQLiteDatabase } from "drizzle-orm/bun-sqlite";

import { NotFoundError } from "@situ/errors";

import { reviews, type ReviewRow } from "../schema";
import type { ReviewRecord } from "../types";

export type CreateReviewRepositoryInput = {
  db: BunSQLiteDatabase<Record<string, unknown>>;
};

export type ReviewByIdInput = {
  id: string;
};

export type ReviewsByProjectInput = {
  projectId: string;
};

export type ReviewWriteInput = {
  review: ReviewRecord;
};

export type ReviewRepository = {
  create(input: ReviewWriteInput): ReviewRecord;
  get(input: ReviewByIdInput): ReviewRecord | undefined;
  listByProject(input: ReviewsByProjectInput): ReviewRecord[];
  require(input: ReviewByIdInput): ReviewRecord;
};

const encodeReview = ({ review }: ReviewWriteInput) => ({
  id: review.id,
  projectId: review.projectId,
  targetKind: review.target.targetKind,
  targetId: review.target.targetId,
  reviewerActorKind: review.reviewer.actorKind,
  reviewerActorId: review.reviewer.actorId,
  status: review.status,
  rationaleMarkdown: review.rationaleMarkdown,
  reviewedCommit: review.reviewedCommit,
  citedMeasurementIdsJson: JSON.stringify(review.citedMeasurementIds),
  citedArtifactIdsJson: JSON.stringify(review.citedArtifactIds),
  createdAt: review.createdAt,
  updatedAt: review.updatedAt,
});

const decodeReview = ({ row }: { row: ReviewRow }): ReviewRecord => ({
  id: row.id,
  projectId: row.projectId,
  target: {
    targetKind: row.targetKind,
    targetId: row.targetId,
  },
  reviewer: {
    actorKind: row.reviewerActorKind,
    actorId: row.reviewerActorId,
  },
  status: row.status,
  rationaleMarkdown: row.rationaleMarkdown,
  reviewedCommit: row.reviewedCommit ?? undefined,
  citedMeasurementIds: JSON.parse(row.citedMeasurementIdsJson) as string[],
  citedArtifactIds: JSON.parse(row.citedArtifactIdsJson) as string[],
  createdAt: row.createdAt,
  updatedAt: row.updatedAt,
});

/**
 * Creates a review repository.
 */
export const createReviewRepository = ({ db }: CreateReviewRepositoryInput): ReviewRepository => {
  const repository: ReviewRepository = {
    create({ review }) {
      db.insert(reviews).values(encodeReview({ review })).run();
      return review;
    },

    get({ id }) {
      const row = db.select().from(reviews).where(eq(reviews.id, id)).get();

      if (row === undefined) {
        return undefined;
      }

      return decodeReview({ row });
    },

    listByProject({ projectId }) {
      return db
        .select()
        .from(reviews)
        .where(eq(reviews.projectId, projectId))
        .all()
        .map((row) => decodeReview({ row }));
    },

    require({ id }) {
      const review = repository.get({ id });

      if (review !== undefined) {
        return review;
      }

      throw new NotFoundError({
        details: {
          id,
          resource: "Review",
        },
        message: `Review not found: ${id}`,
      });
    },
  };

  return repository;
};
