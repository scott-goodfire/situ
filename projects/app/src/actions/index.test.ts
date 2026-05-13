import { expect, test } from "bun:test";

import type { ActorRef, IdPrefix } from "@situ/common";
import { addDurationToIso } from "@situ/common";
import { InvariantError } from "@situ/errors";

import { createInMemoryDatabase } from "../db";
import { createAppActions, createAppRepositories, type Clock, type IdFactory } from ".";

const createTestIdFactory = (): IdFactory => {
  const counts = new Map<IdPrefix, number>();

  return (prefix) => {
    const next = (counts.get(prefix) ?? 0) + 1;
    counts.set(prefix, next);
    return `${prefix}_${String(next).padStart(4, "0")}`;
  };
};

const createTestClock = (): Clock => {
  let offsetSeconds = 0;
  const baseline = "2026-05-12T12:00:00.000Z";

  return () => {
    const timestamp = addDurationToIso({
      duration: {
        seconds: offsetSeconds,
      },
      timestamp: baseline,
    });

    offsetSeconds += 1;

    return timestamp;
  };
};

const coordinator: ActorRef = {
  actorKind: "agent",
  actorId: "coordinator_1",
};

const scientist: ActorRef = {
  actorKind: "agent",
  actorId: "scientist_1",
};

const verifier: ActorRef = {
  actorKind: "agent",
  actorId: "verifier_1",
};

test("durable primitives support a Linear-like task handoff flow", () => {
  const db = createInMemoryDatabase();
  const actions = createAppActions({
    createId: createTestIdFactory(),
    db,
    now: createTestClock(),
  });
  const repositories = createAppRepositories({ db });

  actions.createAgent({
    id: coordinator.actorId,
    instructionsMarkdown: "Break goals into visible tasks.",
    name: "Coordinator",
    role: "coordinator",
  });
  actions.createAgent({
    id: scientist.actorId,
    instructionsMarkdown: "Develop candidate experiments.",
    name: "Scientist",
    role: "scientist",
  });
  actions.createAgent({
    id: verifier.actorId,
    instructionsMarkdown: "Review evidence and request fixes.",
    name: "Verifier",
    role: "verifier",
  });

  const project = actions.createProject({
    actor: coordinator,
    goalMarkdown: "Find a better local search strategy.",
  });
  const label = actions.createLabel({
    name: "signal:promising",
    color: "green",
  });
  const task = actions.createTask({
    actor: coordinator,
    projectId: project.id,
    title: "Try a branch-and-review experiment",
    bodyMarkdown: "Implement one candidate, report results, and request review.",
    type: "implementation",
    assignee: scientist,
    labelIds: [label.id],
  });

  expect(repositories.projects.require({ id: project.id }).goalMarkdown).toContain("local search");
  expect(repositories.tasks.require({ id: task.id }).assignee).toEqual(scientist);
  expect(repositories.tasks.requireLabel({ id: label.id }).name).toBe("signal:promising");

  const assignedNotifications = repositories.notifications.listWakeableByRecipient({
    recipientId: "scientist_1",
  });
  expect(assignedNotifications).toHaveLength(1);
  const assignedNotification = assignedNotifications[0];

  if (assignedNotification === undefined) {
    throw new InvariantError({
      message: "Expected scientist assignment notification",
    });
  }

  expect(assignedNotification.type).toBe("task_assigned");
  expect(assignedNotification.target).toEqual({
    targetKind: "task",
    targetId: task.id,
  });

  const readNotification = actions.markNotificationRead({
    actor: scientist,
    notificationId: assignedNotification.id,
  });
  const agentSession = actions.createAgentSession({
    agentId: scientist.actorId,
    context: {
      targetKind: "task",
      targetId: task.id,
    },
    currentNotificationId: assignedNotification.id,
    remoteClaudeAgentId: "claude_agent_scientist_1",
    remoteClaudeSessionId: "claude_session_1",
    remoteClaudeThreadId: "claude_thread_1",
  });
  const dismissedNotification = actions.dismissNotification({
    actor: scientist,
    notificationId: readNotification.id,
  });

  expect(readNotification.readAt).toBeDefined();
  expect(dismissedNotification.dismissedAt).toBeDefined();
  expect(
    repositories.notifications.listWakeableByRecipient({
      recipientId: "scientist_1",
    }),
  ).toHaveLength(0);

  actions.updateTaskStatus({
    actor: scientist,
    taskId: task.id,
    status: "in_progress",
  });
  actions.createComment({
    actor: scientist,
    target: {
      targetKind: "task",
      targetId: task.id,
    },
    bodyMarkdown: "Started the experiment and found the first viable candidate.",
  });
  const experiment = actions.createExperiment({
    actor: scientist,
    baseCommit: "abc111",
    currentCandidateCommit: "def222",
    projectId: project.id,
    summaryMarkdown: "Candidate branch that widens local search.",
    taskId: task.id,
    title: "Wider beam candidate",
    worktreePath: ".situ/worktrees/experiment_1",
  });
  const firstMeasurement = actions.createMeasurement({
    actor: scientist,
    name: "best_score",
    observedCommit: experiment.currentCandidateCommit,
    projectId: project.id,
    summaryMarkdown: "Candidate improved the baseline score from 0.70 to 0.82.",
    target: {
      targetKind: "experiment",
      targetId: experiment.id,
    },
    value: {
      baseline: 0.7,
      candidate: 0.82,
    },
  });
  const firstArtifact = actions.createArtifact({
    actor: scientist,
    experimentId: experiment.id,
    mediaType: "text/markdown",
    projectId: project.id,
    sourceCommit: experiment.currentCandidateCommit,
    summaryMarkdown: "Run notes for the first candidate revision.",
    target: {
      targetKind: "experiment",
      targetId: experiment.id,
    },
    taskId: task.id,
    title: "First run notes",
    type: "report",
    uri: "artifact://first-run-notes",
  });
  actions.updateTaskStatus({
    actor: scientist,
    taskId: task.id,
    status: "in_review",
    commentMarkdown: "Ready for review. The candidate result is attached in the task history.",
  });
  const review = actions.createReview({
    actor: verifier,
    citedArtifactIds: [firstArtifact.id],
    citedMeasurementIds: [firstMeasurement.id],
    commentMarkdown: "Promising, but please add a stronger held-out measurement.",
    notifyActor: scientist,
    projectId: project.id,
    rationaleMarkdown: "The first result is promising but the evidence is not strong enough.",
    reviewedCommit: experiment.currentCandidateCommit,
    status: "changes_requested",
    target: {
      targetKind: "experiment",
      targetId: experiment.id,
    },
  });
  const revisedExperiment = actions.captureCandidateCommit({
    actor: scientist,
    currentCandidateCommit: "ghi333",
    experimentId: experiment.id,
  });
  const revisedMeasurement = actions.createMeasurement({
    actor: scientist,
    name: "held_out_score",
    observedCommit: revisedExperiment.currentCandidateCommit,
    projectId: project.id,
    summaryMarkdown: "Revised candidate holds the improvement on the held-out set.",
    target: {
      targetKind: "experiment",
      targetId: experiment.id,
    },
    value: {
      candidate: 0.8,
    },
  });
  const approval = actions.createReview({
    actor: verifier,
    citedMeasurementIds: [revisedMeasurement.id],
    projectId: project.id,
    rationaleMarkdown: "The revised evidence is current for the candidate commit.",
    reviewedCommit: revisedExperiment.currentCandidateCommit,
    status: "approved",
    target: {
      targetKind: "experiment",
      targetId: experiment.id,
    },
  });

  const finishedTask = repositories.tasks.require({ id: task.id });
  const comments = repositories.comments.listByTarget({ targetId: task.id });
  const events = repositories.events.listByTarget({ targetId: task.id });
  const reviewNotifications = repositories.notifications.listWakeableByRecipient({
    recipientId: "scientist_1",
  });

  expect(finishedTask.status).toBe("in_review");
  expect(finishedTask.lastActivityAt > task.lastActivityAt).toBe(true);
  expect(repositories.agentSessions.require({ id: agentSession.id }).status).toBe("active");
  expect(repositories.experiments.require({ id: experiment.id }).currentCandidateCommit).toBe(
    "ghi333",
  );
  expect(review.reviewedCommit).toBe("def222");
  expect(approval.reviewedCommit).toBe("ghi333");
  expect(repositories.measurements.listByProject({ projectId: project.id })).toHaveLength(2);
  expect(repositories.artifacts.listByProject({ projectId: project.id })).toHaveLength(1);
  expect(reviewNotifications.map((notification) => notification.type)).toContain(
    "changes_requested",
  );
  expect(comments.map((comment) => comment.bodyMarkdown)).toContain(
    "Started the experiment and found the first viable candidate.",
  );
  expect(comments.map((comment) => comment.bodyMarkdown)).toContain(
    "Ready for review. The candidate result is attached in the task history.",
  );
  expect(events.map((event) => event.type)).toEqual(
    expect.arrayContaining([
      "task.created",
      "task.assigned",
      "task.status_updated",
      "comment.created",
    ]),
  );
});
