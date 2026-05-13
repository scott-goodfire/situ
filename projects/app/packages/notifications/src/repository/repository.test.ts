import { expect, test } from "bun:test";
import { Database } from "bun:sqlite";
import { drizzle } from "drizzle-orm/bun-sqlite";

import { createNotificationRepository } from ".";

test("creates wakeable notifications and updates inbox state", () => {
  const db = drizzle(new Database(":memory:"));
  db.run(`
    CREATE TABLE notifications (
      id TEXT PRIMARY KEY,
      recipient_actor_kind TEXT NOT NULL,
      recipient_actor_id TEXT NOT NULL,
      type TEXT NOT NULL,
      target_kind TEXT NOT NULL,
      target_id TEXT NOT NULL,
      title TEXT NOT NULL,
      body_markdown TEXT,
      read_at TEXT,
      dismissed_at TEXT,
      snoozed_until TEXT,
      delivery_attempted_at TEXT,
      created_at TEXT NOT NULL
    )
  `);

  const notifications = createNotificationRepository({ db });
  const created = notifications.create({
    notification: {
      createdAt: "2026-05-12T00:00:00.000Z",
      id: "notification_1",
      recipient: {
        actorKind: "agent",
        actorId: "scientist_1",
      },
      target: {
        targetKind: "task",
        targetId: "task_1",
      },
      title: "Task assigned",
      type: "task_assigned",
    },
  });

  expect(notifications.listWakeableByRecipient({ recipientId: "scientist_1" })).toHaveLength(1);
  expect(notifications.findOpenEquivalent({ notification: created })?.id).toBe(created.id);

  notifications.update({
    notification: {
      ...created,
      readAt: "2026-05-12T00:00:01.000Z",
    },
  });

  expect(notifications.listWakeableByRecipient({ recipientId: "scientist_1" })).toHaveLength(0);
});
