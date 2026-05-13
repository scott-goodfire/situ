import { createSyncMetadata } from "@situ/common";
import type { ArtifactRecord } from "@situ/artifacts";

import { resolveActionActor } from "./actors";
import { recordEvent } from "./events";
import type { AppRepositories } from "./repositories";
import { ensureTargetExists, targetForArtifact } from "./targets";
import type { Clock, CreateArtifactInput, IdFactory } from "./types";

export type CreateArtifactActionInput = {
  createId: IdFactory;
  input: CreateArtifactInput;
  now: Clock;
  repositories: AppRepositories;
};

/**
 * Creates an artifact.
 */
export const createArtifactAction = ({
  createId,
  input,
  now,
  repositories,
}: CreateArtifactActionInput): ArtifactRecord => {
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

  if (input.taskId !== undefined) {
    repositories.tasks.require({ id: input.taskId });
  }

  if (input.experimentId !== undefined) {
    repositories.experiments.require({ id: input.experimentId });
  }

  const artifact = repositories.artifacts.create({
    artifact: {
      createdAt: timestamp,
      createdBy: actor,
      experimentId: input.experimentId,
      id: input.id ?? createId("artifact"),
      mediaType: input.mediaType,
      projectId: input.projectId,
      sourceCommit: input.sourceCommit,
      summaryMarkdown: input.summaryMarkdown,
      ...createSyncMetadata(),
      target: input.target,
      taskId: input.taskId,
      title: input.title,
      type: input.type,
      updatedAt: timestamp,
      uri: input.uri,
    },
  });

  recordEvent({
    createId,
    event: {
      actor,
      message: "Artifact created",
      payload: {
        artifactId: artifact.id,
        sourceCommit: artifact.sourceCommit,
        type: artifact.type,
      },
      target: targetForArtifact({ artifact }),
      type: "artifact.created",
    },
    now,
    repositories,
  });

  return artifact;
};
