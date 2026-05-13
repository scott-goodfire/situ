import { expect, test } from "bun:test";
import { Database } from "bun:sqlite";
import { drizzle } from "drizzle-orm/bun-sqlite";

import { createReviewRepository } from ".";
import type { ReviewRecord } from "../types";

const review: ReviewRecord = {
  id: "review_1",
  projectId: "project_1",
  target: {
    targetKind: "experiment",
    targetId: "experiment_1",
  },
  reviewer: {
    actorKind: "agent",
    actorId: "verifier_1",
  },
  status: "changes_requested",
  rationaleMarkdown: "Need a stronger held-out measurement.",
  reviewedCommit: "def222",
  citedMeasurementIds: ["measurement_1"],
  citedArtifactIds: ["artifact_1"],
  createdAt: "2026-05-12T12:00:00.000Z",
  updatedAt: "2026-05-12T12:00:00.000Z",
};

test("creates and lists reviews by project", () => {
  const db = drizzle(new Database(":memory:"));
  db.run(`
    CREATE TABLE reviews (
      id TEXT PRIMARY KEY,
      project_id TEXT NOT NULL,
      target_kind TEXT NOT NULL,
      target_id TEXT NOT NULL,
      reviewer_actor_kind TEXT NOT NULL,
      reviewer_actor_id TEXT NOT NULL,
      status TEXT NOT NULL,
      rationale_markdown TEXT NOT NULL,
      reviewed_commit TEXT,
      cited_measurement_ids_json TEXT NOT NULL,
      cited_artifact_ids_json TEXT NOT NULL,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    )
  `);

  const reviews = createReviewRepository({ db });

  reviews.create({ review });

  expect(reviews.require({ id: review.id })).toEqual(review);
  expect(reviews.listByProject({ projectId: "project_1" })).toEqual([review]);
});
