import { expect, test } from "bun:test";
import { Database } from "bun:sqlite";
import { drizzle } from "drizzle-orm/bun-sqlite";

import { createArtifactRepository } from ".";
import type { ArtifactRecord } from "../types";

const artifact: ArtifactRecord = {
  id: "artifact_1",
  syncVersion: 1,
  syncDeleted: false,
  projectId: "project_1",
  target: {
    targetKind: "experiment",
    targetId: "experiment_1",
  },
  type: "report",
  title: "Run summary",
  uri: "artifact://artifact_1/REPORT.md",
  mediaType: "text/markdown",
  summaryMarkdown: "Summary of the candidate run.",
  taskId: "task_1",
  experimentId: "experiment_1",
  sourceCommit: "def222",
  createdBy: {
    actorKind: "agent",
    actorId: "scientist_1",
  },
  createdAt: "2026-05-12T12:00:00.000Z",
  updatedAt: "2026-05-12T12:00:00.000Z",
};

test("creates and lists artifacts by project", () => {
  const db = drizzle(new Database(":memory:"));
  db.run(`
    CREATE TABLE artifacts (
      id TEXT PRIMARY KEY,
      sync_version INTEGER NOT NULL,
      sync_deleted INTEGER NOT NULL,
      project_id TEXT NOT NULL,
      target_kind TEXT NOT NULL,
      target_id TEXT NOT NULL,
      type TEXT NOT NULL,
      title TEXT NOT NULL,
      uri TEXT NOT NULL,
      media_type TEXT,
      summary_markdown TEXT NOT NULL,
      task_id TEXT,
      experiment_id TEXT,
      source_commit TEXT,
      created_by_actor_kind TEXT NOT NULL,
      created_by_actor_id TEXT NOT NULL,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    )
  `);

  const artifacts = createArtifactRepository({ db });

  artifacts.create({ artifact });

  expect(artifacts.require({ id: artifact.id })).toEqual(artifact);
  expect(artifacts.listByProject({ projectId: "project_1" })).toEqual([artifact]);
});
