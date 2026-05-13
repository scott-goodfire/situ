import { expect, test } from "bun:test";
import { Database } from "bun:sqlite";
import { drizzle } from "drizzle-orm/bun-sqlite";

import { createTaskRepository } from ".";

test("creates, lists, and updates tasks", () => {
  const db = drizzle(new Database(":memory:"));
  db.run(`
    CREATE TABLE labels (
      id TEXT PRIMARY KEY,
      sync_version INTEGER NOT NULL,
      sync_deleted INTEGER NOT NULL,
      name TEXT NOT NULL,
      color TEXT,
      archived_at TEXT,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    )
  `);
  db.run(`
    CREATE TABLE tasks (
      id TEXT PRIMARY KEY,
      sync_version INTEGER NOT NULL,
      sync_deleted INTEGER NOT NULL,
      project_id TEXT NOT NULL,
      title TEXT NOT NULL,
      body_markdown TEXT NOT NULL,
      status TEXT NOT NULL,
      type TEXT NOT NULL,
      priority INTEGER NOT NULL,
      creator_actor_kind TEXT NOT NULL,
      creator_actor_id TEXT NOT NULL,
      assignee_actor_kind TEXT,
      assignee_actor_id TEXT,
      active_agent_session_id TEXT,
      parent_task_id TEXT,
      target_kind TEXT,
      target_id TEXT,
      label_ids_json TEXT NOT NULL,
      last_activity_at TEXT NOT NULL,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    )
  `);

  const tasks = createTaskRepository({ db });
  const label = tasks.createLabel({
    label: {
      id: "label_1",
      syncVersion: 1,
      syncDeleted: false,
      name: "risk:high",
      color: "red",
      createdAt: "2026-05-12T00:00:00.000Z",
      updatedAt: "2026-05-12T00:00:00.000Z",
    },
  });
  const created = tasks.create({
    task: {
      bodyMarkdown: "Try the candidate.",
      createdAt: "2026-05-12T00:00:00.000Z",
      creator: {
        actorKind: "agent",
        actorId: "coordinator_1",
      },
      id: "task_1",
      syncVersion: 1,
      syncDeleted: false,
      labelIds: ["label_1"],
      lastActivityAt: "2026-05-12T00:00:00.000Z",
      priority: 0,
      projectId: "project_1",
      status: "backlog",
      title: "Run experiment",
      type: "implementation",
      updatedAt: "2026-05-12T00:00:00.000Z",
    },
  });

  expect(tasks.requireLabel({ id: label.id }).name).toBe("risk:high");
  expect(tasks.listLabels()).toHaveLength(1);
  expect(tasks.listByProject({ projectId: "project_1" })).toHaveLength(1);
  expect(tasks.require({ id: created.id }).labelIds).toEqual(["label_1"]);
  expect(
    tasks.update({
      task: {
        ...created,
        assignee: {
          actorKind: "agent",
          actorId: "scientist_1",
        },
        status: "in_progress",
      },
    }).assignee?.actorId,
  ).toBe("scientist_1");
});
