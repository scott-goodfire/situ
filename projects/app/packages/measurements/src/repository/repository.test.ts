import { expect, test } from "bun:test";
import { Database } from "bun:sqlite";
import { drizzle } from "drizzle-orm/bun-sqlite";

import { createMeasurementRepository } from ".";
import type { MeasurementRecord } from "../types";

const measurement: MeasurementRecord = {
  id: "measurement_1",
  projectId: "project_1",
  target: {
    targetKind: "experiment",
    targetId: "experiment_1",
  },
  name: "accuracy",
  value: {
    score: 0.91,
  },
  unit: "ratio",
  summaryMarkdown: "Candidate reached 91% on the held-out set.",
  observedCommit: "def222",
  measuredBy: {
    actorKind: "agent",
    actorId: "scientist_1",
  },
  createdAt: "2026-05-12T12:00:00.000Z",
};

test("creates and lists measurements by project", () => {
  const db = drizzle(new Database(":memory:"));
  db.run(`
    CREATE TABLE measurements (
      id TEXT PRIMARY KEY,
      project_id TEXT NOT NULL,
      target_kind TEXT NOT NULL,
      target_id TEXT NOT NULL,
      name TEXT NOT NULL,
      value_json TEXT NOT NULL,
      unit TEXT,
      summary_markdown TEXT NOT NULL,
      observed_commit TEXT,
      measured_by_actor_kind TEXT NOT NULL,
      measured_by_actor_id TEXT NOT NULL,
      created_at TEXT NOT NULL
    )
  `);

  const measurements = createMeasurementRepository({ db });

  measurements.create({ measurement });

  expect(measurements.require({ id: measurement.id })).toEqual(measurement);
  expect(measurements.listByProject({ projectId: "project_1" })).toEqual([measurement]);
});
