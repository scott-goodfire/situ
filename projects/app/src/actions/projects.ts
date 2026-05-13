import { advanceSyncMetadata, createSyncMetadata } from "@situ/common";
import type { ProjectRecord } from "@situ/projects";

import { resolveActionActor } from "./actors";
import { createArtifactAction } from "./artifacts";
import { recordEvent } from "./events";
import type { AppRepositories } from "./repositories";
import { targetForProject } from "./targets";
import type {
  Clock,
  CreateFinalReportInput,
  CreateProjectInput,
  IdFactory,
  UpdateProjectSummariesInput,
} from "./types";

export type CreateProjectActionInput = {
  createId: IdFactory;
  input: CreateProjectInput;
  now: Clock;
  repositories: AppRepositories;
};

export type UpdateProjectSummariesActionInput = {
  createId: IdFactory;
  input: UpdateProjectSummariesInput;
  now: Clock;
  repositories: AppRepositories;
};

export type CreateFinalReportActionInput = {
  createId: IdFactory;
  input: CreateFinalReportInput;
  now: Clock;
  repositories: AppRepositories;
};

/**
 * Creates a project.
 */
export const createProjectAction = ({
  createId,
  input,
  now,
  repositories,
}: CreateProjectActionInput): ProjectRecord => {
  const actor = resolveActionActor({
    actor: input.actor,
    repositories,
  });
  const timestamp = now();
  const project = repositories.projects.create({
    project: {
      blockersSummary: "",
      confidenceSummary: "",
      createdAt: timestamp,
      currentAnswerSummary: "",
      currentBaselineSummary: "",
      finalResultSummary: "",
      goalMarkdown: input.goalMarkdown,
      id: input.id ?? createId("project"),
      openQuestionsSummary: "",
      progressCheckpointsSummary: "",
      ...createSyncMetadata(),
      status: input.status ?? "active",
      updatedAt: timestamp,
    },
  });

  recordEvent({
    createId,
    event: {
      actor,
      message: "Project created",
      payload: {
        projectId: project.id,
      },
      target: targetForProject({ project }),
      type: "project.created",
    },
    now,
    repositories,
  });

  return project;
};

/**
 * Updates materialized project summaries.
 */
export const updateProjectSummariesAction = ({
  createId,
  input,
  now,
  repositories,
}: UpdateProjectSummariesActionInput): ProjectRecord => {
  const actor = resolveActionActor({
    actor: input.actor,
    repositories,
  });
  const project = repositories.projects.require({
    id: input.projectId,
  });
  const timestamp = now();
  const updated = repositories.projects.update({
    project: {
      ...project,
      ...input.summaries,
      ...advanceSyncMetadata({ record: project }),
      updatedAt: timestamp,
    },
  });

  recordEvent({
    createId,
    event: {
      actor,
      message: "Project summaries updated",
      payload: {
        summaryFields: Object.keys(input.summaries),
      },
      target: targetForProject({ project: updated }),
      type: "project.summaries_updated",
    },
    now,
    repositories,
  });

  return updated;
};

/**
 * Creates a final report artifact and completes a project.
 */
export const createFinalReportAction = ({
  createId,
  input,
  now,
  repositories,
}: CreateFinalReportActionInput) => {
  const actor = resolveActionActor({
    actor: input.actor,
    repositories,
  });
  const project = repositories.projects.require({
    id: input.projectId,
  });
  const target = targetForProject({ project });
  const artifact = createArtifactAction({
    createId,
    input: {
      actor,
      mediaType: "text/markdown",
      projectId: project.id,
      summaryMarkdown: input.summaryMarkdown,
      target,
      title: input.title ?? "Final report",
      type: "report",
      uri: input.uri ?? `artifact://projects/${project.id}/final-report.md`,
    },
    now,
    repositories,
  });
  const timestamp = now();
  const completed = repositories.projects.update({
    project: {
      ...project,
      finalResultSummary: input.summaryMarkdown,
      status: "complete",
      ...advanceSyncMetadata({ record: project }),
      updatedAt: timestamp,
    },
  });

  recordEvent({
    createId,
    event: {
      actor,
      message: "Project final report created",
      payload: {
        artifactId: artifact.id,
        reportLength: input.reportMarkdown.length,
      },
      target,
      type: "project.final_report_created",
    },
    now,
    repositories,
  });

  return {
    artifact,
    project: completed,
  };
};
