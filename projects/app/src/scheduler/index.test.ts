import { expect, test } from "bun:test";

import { createAppActions, createAppRepositories } from "../actions";
import { createAgentTools } from "../agent-tools";
import { createInMemoryDatabase } from "../db";
import { createManagedAgentsRuntime } from "../managed-agents";
import { runSchedulerTick } from ".";

test("scheduler wakes agents from visible notifications", () => {
  const db = createInMemoryDatabase();
  const actions = createAppActions({ db });
  const repositories = createAppRepositories({ db });
  const managedAgents = createManagedAgentsRuntime({ actions, repositories });

  actions.createAgent({
    id: "scientist_1",
    instructionsMarkdown: "Develop candidate experiments.",
    name: "Scientist",
    role: "scientist",
  });
  const project = actions.createProject({
    goalMarkdown: "Find a better local search strategy.",
  });
  actions.createTask({
    assignee: {
      actorKind: "agent",
      actorId: "scientist_1",
    },
    bodyMarkdown: "Try one candidate branch.",
    projectId: project.id,
    title: "Run experiment",
    type: "implementation",
  });

  const tools = createAgentTools({ actions, repositories });

  expect(tools.listInbox({ agentId: "scientist_1" })).toHaveLength(1);

  const result = runSchedulerTick({
    actions,
    managedAgents,
    repositories,
  });
  const notification = repositories.notifications.listRecentByRecipient({
    recipientId: "scientist_1",
  })[0];

  expect(result.woken).toHaveLength(1);
  expect(result.skipped).toBe(0);
  expect(result.recovered).toBe(0);
  expect(notification?.deliveryAttemptedAt).toBeDefined();
  expect(repositories.agentSessions.listByAgent({ agentId: "scientist_1" })).toHaveLength(1);

  const agentSession = repositories.agentSessions.listByAgent({ agentId: "scientist_1" })[0];

  if (agentSession === undefined) {
    throw new Error("Expected scheduler to create an agent session");
  }

  managedAgents.recordClaudeRemoteEvent({
    agentSessionId: agentSession.id,
    cursor: "cursor_1",
    payload: {
      type: "message",
    },
    remoteId: "remote_event_1",
    summary: "Claude emitted a message.",
  });

  expect(repositories.agentSessions.listLogs({ agentSessionId: agentSession.id })).toHaveLength(1);

  runSchedulerTick({
    actions,
    managedAgents,
    repositories,
  });

  expect(repositories.agentSessions.listByAgent({ agentId: "scientist_1" })).toHaveLength(1);
});

test("scheduler recovers stale assigned work through visible records", () => {
  const db = createInMemoryDatabase();
  const actions = createAppActions({
    db,
    now: () => "2026-05-12T10:00:00.000Z",
  });
  const repositories = createAppRepositories({ db });
  const managedAgents = createManagedAgentsRuntime({ actions, repositories });

  actions.createAgent({
    id: "scientist_1",
    instructionsMarkdown: "Develop candidate experiments.",
    name: "Scientist",
    role: "scientist",
  });
  const project = actions.createProject({
    goalMarkdown: "Find a better local search strategy.",
  });
  const task = actions.createTask({
    assignee: {
      actorKind: "agent",
      actorId: "scientist_1",
    },
    bodyMarkdown: "Try one candidate branch.",
    projectId: project.id,
    status: "in_progress",
    title: "Run experiment",
    type: "implementation",
  });

  const result = runSchedulerTick({
    actions,
    managedAgents,
    now: () => "2026-05-12T12:00:00.000Z",
    repositories,
    staleAfter: {
      minutes: 30,
    },
  });
  const recovered = repositories.tasks.require({ id: task.id });
  const comments = repositories.comments.listByTarget({ targetId: task.id });

  expect(result.recovered).toBe(1);
  expect(recovered.status).toBe("backlog");
  expect(recovered.assignee).toEqual({
    actorKind: "system",
    actorId: "system",
  });
  expect(comments.map((comment) => comment.bodyMarkdown)).toContain(
    "Work was returned to the board because the assigned agent had no recent visible activity.",
  );
});
