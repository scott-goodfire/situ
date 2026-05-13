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

test("durable primitives support a Linear-like task handoff flow", () => {
  const db = createInMemoryDatabase();
  const actions = createAppActions({
    createId: createTestIdFactory(),
    db,
    now: createTestClock(),
  });
  const repositories = createAppRepositories({ db });

  const project = actions.createProject({
    actor: coordinator,
    goalMarkdown: "Find a better local search strategy.",
  });
  const task = actions.createTask({
    actor: coordinator,
    projectId: project.id,
    title: "Try a branch-and-review experiment",
    bodyMarkdown: "Implement one candidate, report results, and request review.",
    type: "implementation",
    assignee: scientist,
  });

  expect(repositories.projects.require({ id: project.id }).goalMarkdown).toContain("local search");
  expect(repositories.tasks.require({ id: task.id }).assignee).toEqual(scientist);

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
  actions.updateTaskStatus({
    actor: scientist,
    taskId: task.id,
    status: "in_review",
    commentMarkdown: "Ready for review. The candidate result is attached in the task history.",
  });

  const finishedTask = repositories.tasks.require({ id: task.id });
  const comments = repositories.comments.listByTarget({ targetId: task.id });
  const events = repositories.events.listByTarget({ targetId: task.id });

  expect(finishedTask.status).toBe("in_review");
  expect(finishedTask.lastActivityAt > task.lastActivityAt).toBe(true);
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
