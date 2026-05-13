import { advanceSyncMetadata } from "@situ/common";
import type { TargetRef } from "@situ/common";
import { InvalidArgumentError } from "@situ/errors";
import type { AgentSessionRecord } from "@situ/agent-sessions";
import type { AgentRecord } from "@situ/agents";
import type { ArtifactRecord } from "@situ/artifacts";
import type { CommentRecord } from "@situ/comments";
import type { EventRecord } from "@situ/events";
import type { ExperimentRecord } from "@situ/experiments";
import type { MeasurementRecord } from "@situ/measurements";
import type { NotificationRecord } from "@situ/notifications";
import type { ProjectRecord } from "@situ/projects";
import type { ReviewRecord } from "@situ/reviews";
import type { TaskRecord } from "@situ/tasks";

import type { AppRepositories } from "./repositories";

export type EnsureTargetExistsInput = {
  repositories: AppRepositories;
  target: TargetRef;
};

export type UpdateTargetActivityInput = {
  repositories: AppRepositories;
  target: TargetRef;
  timestamp: string;
};

/**
 * Returns the target for a project.
 */
export const targetForProject = ({ project }: { project: ProjectRecord }): TargetRef => ({
  targetKind: "project",
  targetId: project.id,
});

/**
 * Returns the target for a task.
 */
export const targetForTask = ({ task }: { task: TaskRecord }): TargetRef => ({
  targetKind: "task",
  targetId: task.id,
});

/**
 * Returns the target for an agent.
 */
export const targetForAgent = ({ agent }: { agent: AgentRecord }): TargetRef => ({
  targetKind: "agent",
  targetId: agent.id,
});

/**
 * Returns the target for an agent session.
 */
export const targetForAgentSession = ({
  agentSession,
}: {
  agentSession: AgentSessionRecord;
}): TargetRef => ({
  targetKind: "agent_session",
  targetId: agentSession.id,
});

/**
 * Returns the target for an artifact.
 */
export const targetForArtifact = ({ artifact }: { artifact: ArtifactRecord }): TargetRef => ({
  targetKind: "artifact",
  targetId: artifact.id,
});

/**
 * Returns the target for a comment.
 */
export const targetForComment = ({ comment }: { comment: CommentRecord }): TargetRef => ({
  targetKind: "comment",
  targetId: comment.id,
});

/**
 * Returns the target for an event.
 */
export const targetForEvent = ({ event }: { event: EventRecord }): TargetRef => ({
  targetKind: "event",
  targetId: event.id,
});

/**
 * Returns the target for an experiment.
 */
export const targetForExperiment = ({
  experiment,
}: {
  experiment: ExperimentRecord;
}): TargetRef => ({
  targetKind: "experiment",
  targetId: experiment.id,
});

/**
 * Returns the target for a measurement.
 */
export const targetForMeasurement = ({
  measurement,
}: {
  measurement: MeasurementRecord;
}): TargetRef => ({
  targetKind: "measurement",
  targetId: measurement.id,
});

/**
 * Returns the target for a notification.
 */
export const targetForNotification = ({
  notification,
}: {
  notification: NotificationRecord;
}): TargetRef => ({
  targetKind: "notification",
  targetId: notification.id,
});

/**
 * Returns the target for a review.
 */
export const targetForReview = ({ review }: { review: ReviewRecord }): TargetRef => ({
  targetKind: "review",
  targetId: review.id,
});

/**
 * Ensures a target exists.
 */
export const ensureTargetExists = ({ repositories, target }: EnsureTargetExistsInput): void => {
  if (target.targetKind === "agent") {
    repositories.agents.require({ id: target.targetId });
    return;
  }

  if (target.targetKind === "agent_session") {
    repositories.agentSessions.require({ id: target.targetId });
    return;
  }

  if (target.targetKind === "artifact") {
    repositories.artifacts.require({ id: target.targetId });
    return;
  }

  if (target.targetKind === "comment") {
    repositories.comments.require({ id: target.targetId });
    return;
  }

  if (target.targetKind === "event") {
    repositories.events.require({ id: target.targetId });
    return;
  }

  if (target.targetKind === "experiment") {
    repositories.experiments.require({ id: target.targetId });
    return;
  }

  if (target.targetKind === "measurement") {
    repositories.measurements.require({ id: target.targetId });
    return;
  }

  if (target.targetKind === "project") {
    repositories.projects.require({ id: target.targetId });
    return;
  }

  if (target.targetKind === "task") {
    repositories.tasks.require({ id: target.targetId });
    return;
  }

  if (target.targetKind === "notification") {
    repositories.notifications.require({ id: target.targetId });
    return;
  }

  if (target.targetKind === "review") {
    repositories.reviews.require({ id: target.targetId });
    return;
  }

  throw new InvalidArgumentError({
    details: {
      target,
    },
    message: `Unsupported action target: ${target.targetKind}`,
  });
};

/**
 * Updates target activity.
 */
export const updateTargetActivity = ({
  repositories,
  target,
  timestamp,
}: UpdateTargetActivityInput): void => {
  if (target.targetKind !== "task") {
    return;
  }

  const task = repositories.tasks.require({ id: target.targetId });

  repositories.tasks.update({
    task: {
      ...task,
      lastActivityAt: timestamp,
      ...advanceSyncMetadata({ record: task }),
      updatedAt: timestamp,
    },
  });
};
