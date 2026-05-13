import { expect, test } from "bun:test";
import { Database } from "bun:sqlite";
import { drizzle } from "drizzle-orm/bun-sqlite";

import { createExperimentRepository } from ".";
import type { ExperimentRecord } from "../types";

const timestamp = "2026-05-12T12:00:00.000Z";

const createExperiment = (): ExperimentRecord => ({
  id: "experiment_1",
  syncVersion: 1,
  syncDeleted: false,
  projectId: "project_1",
  taskId: "task_1",
  title: "Try wider beam search",
  summaryMarkdown: "Candidate branch for a wider beam.",
  worktreePath: ".situ/worktrees/experiment_1",
  baseCommit: "abc111",
  currentCandidateCommit: "def222",
  status: "active",
  createdAt: timestamp,
  updatedAt: timestamp,
});

test("creates, lists, and revises experiments", () => {
  const db = drizzle(new Database(":memory:"));
  db.run(`
    CREATE TABLE experiments (
      id TEXT PRIMARY KEY,
      sync_version INTEGER NOT NULL,
      sync_deleted INTEGER NOT NULL,
      project_id TEXT NOT NULL,
      task_id TEXT,
      parent_experiment_id TEXT,
      title TEXT NOT NULL,
      summary_markdown TEXT NOT NULL,
      worktree_path TEXT NOT NULL,
      base_commit TEXT NOT NULL,
      current_candidate_commit TEXT NOT NULL,
      status TEXT NOT NULL,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    )
  `);

  const experiments = createExperimentRepository({ db });
  const experiment = createExperiment();

  experiments.create({ experiment });

  expect(experiments.require({ id: experiment.id }).currentCandidateCommit).toBe("def222");
  expect(experiments.listByProject({ projectId: "project_1" })).toHaveLength(1);

  const updated = experiments.update({
    experiment: {
      ...experiment,
      currentCandidateCommit: "ghi333",
      status: "in_review",
      updatedAt: "2026-05-12T12:01:00.000Z",
    },
  });

  expect(updated.currentCandidateCommit).toBe("ghi333");
  expect(experiments.require({ id: experiment.id }).status).toBe("in_review");
});
