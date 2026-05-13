import { expect, test } from "bun:test";
import { Database } from "bun:sqlite";
import { drizzle } from "drizzle-orm/bun-sqlite";

import { createProjectRepository } from ".";

test("creates, gets, and updates projects", () => {
  const db = drizzle(new Database(":memory:"));
  db.run(`
    CREATE TABLE projects (
      id TEXT PRIMARY KEY,
      goal_markdown TEXT NOT NULL,
      status TEXT NOT NULL,
      current_baseline_summary TEXT NOT NULL,
      current_answer_summary TEXT NOT NULL,
      confidence_summary TEXT NOT NULL,
      blockers_summary TEXT NOT NULL,
      open_questions_summary TEXT NOT NULL,
      progress_checkpoints_summary TEXT NOT NULL,
      final_result_summary TEXT NOT NULL,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    )
  `);

  const projects = createProjectRepository({ db });
  const created = projects.create({
    project: {
      blockersSummary: "",
      confidenceSummary: "",
      createdAt: "2026-05-12T00:00:00.000Z",
      currentAnswerSummary: "",
      currentBaselineSummary: "",
      finalResultSummary: "",
      goalMarkdown: "Find the best answer.",
      id: "project_1",
      openQuestionsSummary: "",
      progressCheckpointsSummary: "",
      status: "active",
      updatedAt: "2026-05-12T00:00:00.000Z",
    },
  });

  expect(projects.require({ id: created.id }).goalMarkdown).toBe("Find the best answer.");
  expect(
    projects.update({
      project: {
        ...created,
        status: "paused",
        updatedAt: "2026-05-12T00:00:01.000Z",
      },
    }).status,
  ).toBe("paused");
});
