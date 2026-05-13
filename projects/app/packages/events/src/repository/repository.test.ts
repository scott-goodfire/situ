import { expect, test } from "bun:test";
import { Database } from "bun:sqlite";
import { drizzle } from "drizzle-orm/bun-sqlite";

import { createEventRepository } from ".";

test("creates and lists events by target", () => {
  const db = drizzle(new Database(":memory:"));
  db.run(`
    CREATE TABLE events (
      id TEXT PRIMARY KEY,
      type TEXT NOT NULL,
      actor_kind TEXT NOT NULL,
      actor_id TEXT NOT NULL,
      target_kind TEXT NOT NULL,
      target_id TEXT NOT NULL,
      message TEXT NOT NULL,
      payload_json TEXT NOT NULL,
      created_at TEXT NOT NULL
    )
  `);

  const events = createEventRepository({ db });
  events.create({
    event: {
      actor: {
        actorKind: "agent",
        actorId: "coordinator_1",
      },
      createdAt: "2026-05-12T00:00:00.000Z",
      id: "event_1",
      message: "Task created",
      payload: {
        taskId: "task_1",
      },
      target: {
        targetKind: "task",
        targetId: "task_1",
      },
      type: "task.created",
    },
  });

  expect(events.listByTarget({ targetId: "task_1" }).map((event) => event.type)).toEqual([
    "task.created",
  ]);
});
