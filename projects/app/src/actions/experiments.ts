import { advanceSyncMetadata, createSyncMetadata } from "@situ/common";
import type { ExperimentRecord } from "@situ/experiments";

import { resolveActionActor } from "./actors";
import { recordEvent } from "./events";
import type { AppRepositories } from "./repositories";
import { targetForExperiment } from "./targets";
import type {
  CaptureCandidateCommitInput,
  Clock,
  CreateExperimentInput,
  IdFactory,
  UpdateExperimentStatusInput,
} from "./types";

export type CreateExperimentActionInput = {
  createId: IdFactory;
  input: CreateExperimentInput;
  now: Clock;
  repositories: AppRepositories;
};

export type UpdateExperimentStatusActionInput = {
  createId: IdFactory;
  input: UpdateExperimentStatusInput;
  now: Clock;
  repositories: AppRepositories;
};

export type CaptureCandidateCommitActionInput = {
  createId: IdFactory;
  input: CaptureCandidateCommitInput;
  now: Clock;
  repositories: AppRepositories;
};

/**
 * Creates an experiment.
 */
export const createExperimentAction = ({
  createId,
  input,
  now,
  repositories,
}: CreateExperimentActionInput): ExperimentRecord => {
  const actor = resolveActionActor({
    actor: input.actor,
    repositories,
  });
  const timestamp = now();

  repositories.projects.require({ id: input.projectId });

  if (input.taskId !== undefined) {
    repositories.tasks.require({ id: input.taskId });
  }

  if (input.parentExperimentId !== undefined) {
    repositories.experiments.require({ id: input.parentExperimentId });
  }

  const experiment = repositories.experiments.create({
    experiment: {
      baseCommit: input.baseCommit,
      createdAt: timestamp,
      currentCandidateCommit: input.currentCandidateCommit,
      id: input.id ?? createId("experiment"),
      parentExperimentId: input.parentExperimentId,
      projectId: input.projectId,
      status: "active",
      summaryMarkdown: input.summaryMarkdown,
      ...createSyncMetadata(),
      taskId: input.taskId,
      title: input.title,
      updatedAt: timestamp,
      worktreePath: input.worktreePath,
    },
  });

  recordEvent({
    createId,
    event: {
      actor,
      message: "Experiment created",
      payload: {
        currentCandidateCommit: experiment.currentCandidateCommit,
        experimentId: experiment.id,
        projectId: experiment.projectId,
        taskId: experiment.taskId,
      },
      target: targetForExperiment({ experiment }),
      type: "experiment.created",
    },
    now,
    repositories,
  });

  return experiment;
};

/**
 * Updates experiment status.
 */
export const updateExperimentStatusAction = ({
  createId,
  input,
  now,
  repositories,
}: UpdateExperimentStatusActionInput): ExperimentRecord => {
  const actor = resolveActionActor({
    actor: input.actor,
    repositories,
  });
  const experiment = repositories.experiments.require({
    id: input.experimentId,
  });
  const timestamp = now();
  const updated = repositories.experiments.update({
    experiment: {
      ...experiment,
      ...advanceSyncMetadata({ record: experiment }),
      status: input.status,
      updatedAt: timestamp,
    },
  });

  recordEvent({
    createId,
    event: {
      actor,
      message: `Experiment status changed from ${experiment.status} to ${updated.status}`,
      payload: {
        from: experiment.status,
        to: updated.status,
      },
      target: targetForExperiment({ experiment: updated }),
      type: "experiment.status_updated",
    },
    now,
    repositories,
  });

  return updated;
};

/**
 * Captures an experiment candidate commit.
 */
export const captureCandidateCommitAction = ({
  createId,
  input,
  now,
  repositories,
}: CaptureCandidateCommitActionInput): ExperimentRecord => {
  const actor = resolveActionActor({
    actor: input.actor,
    repositories,
  });
  const experiment = repositories.experiments.require({
    id: input.experimentId,
  });
  const timestamp = now();
  const updated = repositories.experiments.update({
    experiment: {
      ...experiment,
      currentCandidateCommit: input.currentCandidateCommit,
      ...advanceSyncMetadata({ record: experiment }),
      updatedAt: timestamp,
    },
  });

  recordEvent({
    createId,
    event: {
      actor,
      message: "Experiment candidate commit captured",
      payload: {
        from: experiment.currentCandidateCommit,
        to: updated.currentCandidateCommit,
      },
      target: targetForExperiment({ experiment: updated }),
      type: "experiment.candidate_commit_captured",
    },
    now,
    repositories,
  });

  return updated;
};
