import { createId as createPrefixedId, nowIso, SYSTEM_ACTOR } from "@situ/common";
import type { AgentSessionRecord } from "@situ/agent-sessions";
import type { AgentRecord } from "@situ/agents";
import type { ArtifactRecord } from "@situ/artifacts";
import type { CommentRecord } from "@situ/comments";
import type { ExperimentRecord } from "@situ/experiments";
import type { MeasurementRecord } from "@situ/measurements";
import type { NotificationRecord } from "@situ/notifications";
import type { ProjectRecord } from "@situ/projects";
import type { ReviewRecord } from "@situ/reviews";
import type { LabelRecord } from "@situ/tasks";
import type { TaskRecord } from "@situ/tasks";
import type { BunSQLiteDatabase } from "drizzle-orm/bun-sqlite";

import { createAgentSessionAction, updateAgentSessionStatusAction } from "./agent-sessions";
import { createAgentAction } from "./agents";
import { createArtifactAction } from "./artifacts";
import { addComment } from "./comments";
import {
  captureCandidateCommitAction,
  createExperimentAction,
  updateExperimentStatusAction,
} from "./experiments";
import { createLabelAction } from "./labels";
import { createMeasurementAction } from "./measurements";
import {
  dismissNotification,
  markNotificationRead,
  markNotificationUnread,
  recordNotificationDeliveryAttempt,
  snoozeNotification,
} from "./notifications";
import { createProjectAction } from "./projects";
import { createAppRepositories, type AppRepositories } from "./repositories";
import { createReviewAction } from "./reviews";
import { assignTaskAction, createTaskAction, updateTaskStatusAction } from "./tasks";
import type {
  AssignTaskInput,
  CaptureCandidateCommitInput,
  CreateAppActionsInput,
  CreateAgentInput,
  CreateAgentSessionInput,
  CreateArtifactInput,
  CreateCommentInput,
  CreateExperimentInput,
  CreateLabelInput,
  CreateMeasurementInput,
  CreateProjectInput,
  CreateReviewInput,
  CreateTaskInput,
  IdFactory,
  NotificationInput,
  RecordNotificationDeliveryAttemptInput,
  SnoozeNotificationInput,
  UpdateAgentSessionStatusInput,
  UpdateExperimentStatusInput,
  UpdateTaskStatusInput,
} from "./types";

const defaultIdFactory: IdFactory = (prefix) => createPrefixedId(prefix);

export type AppActions = {
  assignTask(input: AssignTaskInput): TaskRecord;
  captureCandidateCommit(input: CaptureCandidateCommitInput): ExperimentRecord;
  claimTask(input: Omit<AssignTaskInput, "assignee">): TaskRecord;
  createAgent(input: CreateAgentInput): AgentRecord;
  createAgentSession(input: CreateAgentSessionInput): AgentSessionRecord;
  createArtifact(input: CreateArtifactInput): ArtifactRecord;
  createComment(input: CreateCommentInput): CommentRecord;
  createExperiment(input: CreateExperimentInput): ExperimentRecord;
  createLabel(input: CreateLabelInput): LabelRecord;
  createMeasurement(input: CreateMeasurementInput): MeasurementRecord;
  createProject(input: CreateProjectInput): ProjectRecord;
  createReview(input: CreateReviewInput): ReviewRecord;
  createTask(input: CreateTaskInput): TaskRecord;
  dismissNotification(input: NotificationInput): NotificationRecord;
  markNotificationRead(input: NotificationInput): NotificationRecord;
  markNotificationUnread(input: NotificationInput): NotificationRecord;
  recordNotificationDeliveryAttempt(
    input: RecordNotificationDeliveryAttemptInput,
  ): NotificationRecord;
  snoozeNotification(input: SnoozeNotificationInput): NotificationRecord;
  updateAgentSessionStatus(input: UpdateAgentSessionStatusInput): AgentSessionRecord;
  updateExperimentStatus(input: UpdateExperimentStatusInput): ExperimentRecord;
  updateTaskStatus(input: UpdateTaskStatusInput): TaskRecord;
};

/**
 * Creates the app action surface.
 */
export const createAppActions = ({
  createId = defaultIdFactory,
  db,
  now = nowIso,
}: CreateAppActionsInput): AppActions => {
  const runWrite = <T>({ write }: { write: (repositories: AppRepositories) => T }): T =>
    db.transaction((transaction) =>
      write(
        createAppRepositories({
          db: transaction as unknown as BunSQLiteDatabase<Record<string, unknown>>,
        }),
      ),
    );

  return {
    assignTask(input) {
      return runWrite({
        write: (repositories) =>
          assignTaskAction({
            createId,
            input,
            now,
            repositories,
          }),
      });
    },

    captureCandidateCommit(input) {
      return runWrite({
        write: (repositories) =>
          captureCandidateCommitAction({
            createId,
            input,
            now,
            repositories,
          }),
      });
    },

    claimTask(input) {
      const actor = input.actor ?? SYSTEM_ACTOR;

      return runWrite({
        write: (repositories) =>
          assignTaskAction({
            createId,
            input: {
              ...input,
              actor,
              assignee: actor,
            },
            now,
            repositories,
          }),
      });
    },

    createAgent(input) {
      return runWrite({
        write: (repositories) =>
          createAgentAction({
            createId,
            input,
            now,
            repositories,
          }),
      });
    },

    createAgentSession(input) {
      return runWrite({
        write: (repositories) =>
          createAgentSessionAction({
            createId,
            input,
            now,
            repositories,
          }),
      });
    },

    createArtifact(input) {
      return runWrite({
        write: (repositories) =>
          createArtifactAction({
            createId,
            input,
            now,
            repositories,
          }),
      });
    },

    createComment(input) {
      return runWrite({
        write: (repositories) =>
          addComment({
            createId,
            input,
            now,
            repositories,
          }),
      });
    },

    createExperiment(input) {
      return runWrite({
        write: (repositories) =>
          createExperimentAction({
            createId,
            input,
            now,
            repositories,
          }),
      });
    },

    createLabel(input) {
      return runWrite({
        write: (repositories) =>
          createLabelAction({
            createId,
            input,
            now,
            repositories,
          }),
      });
    },

    createMeasurement(input) {
      return runWrite({
        write: (repositories) =>
          createMeasurementAction({
            createId,
            input,
            now,
            repositories,
          }),
      });
    },

    createProject(input) {
      return runWrite({
        write: (repositories) =>
          createProjectAction({
            createId,
            input,
            now,
            repositories,
          }),
      });
    },

    createReview(input) {
      return runWrite({
        write: (repositories) =>
          createReviewAction({
            createId,
            input,
            now,
            repositories,
          }),
      });
    },

    createTask(input) {
      return runWrite({
        write: (repositories) =>
          createTaskAction({
            createId,
            input,
            now,
            repositories,
          }),
      });
    },

    dismissNotification(input) {
      return runWrite({
        write: (repositories) =>
          dismissNotification({
            createId,
            input,
            now,
            repositories,
          }),
      });
    },

    markNotificationRead(input) {
      return runWrite({
        write: (repositories) =>
          markNotificationRead({
            createId,
            input,
            now,
            repositories,
          }),
      });
    },

    markNotificationUnread(input) {
      return runWrite({
        write: (repositories) =>
          markNotificationUnread({
            createId,
            input,
            now,
            repositories,
          }),
      });
    },

    recordNotificationDeliveryAttempt(input) {
      return runWrite({
        write: (repositories) =>
          recordNotificationDeliveryAttempt({
            createId,
            input,
            now,
            repositories,
          }),
      });
    },

    snoozeNotification(input) {
      return runWrite({
        write: (repositories) =>
          snoozeNotification({
            createId,
            input,
            now,
            repositories,
          }),
      });
    },

    updateAgentSessionStatus(input) {
      return runWrite({
        write: (repositories) =>
          updateAgentSessionStatusAction({
            createId,
            input,
            now,
            repositories,
          }),
      });
    },

    updateExperimentStatus(input) {
      return runWrite({
        write: (repositories) =>
          updateExperimentStatusAction({
            createId,
            input,
            now,
            repositories,
          }),
      });
    },

    updateTaskStatus(input) {
      return runWrite({
        write: (repositories) =>
          updateTaskStatusAction({
            createId,
            input,
            now,
            repositories,
          }),
      });
    },
  };
};
