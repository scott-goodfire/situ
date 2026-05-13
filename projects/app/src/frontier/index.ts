import type { ExperimentRecord } from "@situ/experiments";
import type { ReviewRecord } from "@situ/reviews";

import type { AppRepositories } from "../actions/repositories";

export type DeriveFrontierInput = {
  projectId: string;
  repositories: AppRepositories;
};

export type FrontierView = {
  active: ExperimentRecord[];
  terminal: ExperimentRecord[];
  bestCandidates: ExperimentRecord[];
};

const isCurrentReview = ({
  experiment,
  review,
}: {
  experiment: ExperimentRecord;
  review: ReviewRecord;
}): boolean => {
  if (review.target.targetKind !== "experiment" || review.target.targetId !== experiment.id) {
    return false;
  }

  if (review.reviewedCommit === undefined) {
    return true;
  }

  return review.reviewedCommit === experiment.currentCandidateCommit;
};

const hasCurrentBlockingReview = ({
  experiment,
  reviews,
}: {
  experiment: ExperimentRecord;
  reviews: ReviewRecord[];
}): boolean =>
  reviews.some((review) => {
    if (!isCurrentReview({ experiment, review })) {
      return false;
    }

    return review.status === "changes_requested" || review.status === "rejected";
  });

const hasCurrentApproval = ({
  experiment,
  reviews,
}: {
  experiment: ExperimentRecord;
  reviews: ReviewRecord[];
}): boolean =>
  reviews.some((review) => {
    if (!isCurrentReview({ experiment, review })) {
      return false;
    }

    return review.status === "approved";
  });

/**
 * Derives the experiment frontier.
 */
export const deriveFrontier = ({ projectId, repositories }: DeriveFrontierInput): FrontierView => {
  const experiments = repositories.experiments.listByProject({ projectId });
  const reviews = repositories.reviews.listByProject({ projectId });
  const active = experiments.filter(
    (experiment) => experiment.status === "active" || experiment.status === "in_review",
  );
  const terminal = experiments.filter(
    (experiment) =>
      experiment.status === "accepted" ||
      experiment.status === "rejected" ||
      experiment.status === "abandoned",
  );
  const bestCandidates = experiments.filter((experiment) => {
    if (hasCurrentBlockingReview({ experiment, reviews })) {
      return false;
    }

    if (experiment.status === "accepted") {
      return true;
    }

    return hasCurrentApproval({ experiment, reviews });
  });

  return {
    active,
    bestCandidates,
    terminal,
  };
};
