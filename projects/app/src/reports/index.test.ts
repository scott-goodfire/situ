import { expect, test } from "bun:test";

import { createAppActions, createAppRepositories } from "../actions";
import { createInMemoryDatabase } from "../db";
import { generateProjectReport } from ".";

test("generates reports from durable records", () => {
  const db = createInMemoryDatabase();
  const actions = createAppActions({ db });
  const repositories = createAppRepositories({ db });
  const project = actions.createProject({
    id: "project_1",
    goalMarkdown: "Find a better local search strategy.",
  });
  const task = actions.createTask({
    bodyMarkdown: "Try one candidate branch.",
    id: "task_1",
    projectId: project.id,
    title: "Run experiment",
    type: "implementation",
  });
  const experiment = actions.createExperiment({
    baseCommit: "abc111",
    currentCandidateCommit: "def222",
    id: "experiment_1",
    projectId: project.id,
    summaryMarkdown: "Candidate branch that widens local search.",
    taskId: task.id,
    title: "Wider beam candidate",
    worktreePath: ".situ/worktrees/experiment_1",
  });
  const measurement = actions.createMeasurement({
    id: "measurement_1",
    name: "best_score",
    observedCommit: experiment.currentCandidateCommit,
    projectId: project.id,
    summaryMarkdown: "Candidate improved the baseline score.",
    target: {
      targetKind: "experiment",
      targetId: experiment.id,
    },
    value: {
      candidate: 0.82,
    },
  });

  actions.createReview({
    citedMeasurementIds: [measurement.id],
    id: "review_1",
    projectId: project.id,
    rationaleMarkdown: "Evidence supports keeping this candidate.",
    reviewedCommit: experiment.currentCandidateCommit,
    status: "approved",
    target: {
      targetKind: "experiment",
      targetId: experiment.id,
    },
  });

  const report = generateProjectReport({
    projectId: project.id,
    repositories,
  });

  expect(report).toContain("Find a better local search strategy.");
  expect(report).toContain("experiment_1: active at def222");
  expect(report).toContain("review_1: approved on def222");
  expect(report).toContain("Best Candidates");
});
