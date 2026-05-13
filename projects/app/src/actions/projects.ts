import { SYSTEM_ACTOR } from "@situ/common";
import type { ProjectRecord } from "@situ/projects";

import { recordEvent } from "./events";
import type { AppRepositories } from "./repositories";
import { targetForProject } from "./targets";
import type { Clock, CreateProjectInput, IdFactory } from "./types";

export type CreateProjectActionInput = {
  createId: IdFactory;
  input: CreateProjectInput;
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
  const actor = input.actor ?? SYSTEM_ACTOR;
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
