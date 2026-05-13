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
  const managedAgents = createManagedAgentsRuntime({ actions });

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
  expect(notification?.deliveryAttemptedAt).toBeDefined();
  expect(repositories.agentSessions.listByAgent({ agentId: "scientist_1" })).toHaveLength(1);
});
