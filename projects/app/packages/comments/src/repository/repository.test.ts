import { expect, test } from "bun:test";
import { Database } from "bun:sqlite";
import { drizzle } from "drizzle-orm/bun-sqlite";

import { createCommentRepository } from ".";

test("creates and lists comments by target", () => {
  const db = drizzle(new Database(":memory:"));
  db.run(`
    CREATE TABLE comments (
      id TEXT PRIMARY KEY,
      target_kind TEXT NOT NULL,
      target_id TEXT NOT NULL,
      author_actor_kind TEXT NOT NULL,
      author_actor_id TEXT NOT NULL,
      body_markdown TEXT NOT NULL,
      cited_targets_json TEXT NOT NULL,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    )
  `);

  const comments = createCommentRepository({ db });
  comments.create({
    comment: {
      author: {
        actorKind: "agent",
        actorId: "scientist_1",
      },
      bodyMarkdown: "Ready for review.",
      citedTargets: [],
      createdAt: "2026-05-12T00:00:00.000Z",
      id: "comment_1",
      target: {
        targetKind: "task",
        targetId: "task_1",
      },
      updatedAt: "2026-05-12T00:00:00.000Z",
    },
  });

  expect(
    comments.listByTarget({ targetId: "task_1" }).map((comment) => comment.bodyMarkdown),
  ).toEqual(["Ready for review."]);
});
