import { mkdtemp, readFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { describe, expect, test } from "bun:test";

import {
  TINY_AUTORESEARCH_FIXTURE_FILES,
  TINY_AUTORESEARCH_SCENARIOS,
  TINY_AUTORESEARCH_IDS,
  tinyAutoresearchFilePaths,
  tinyAutoresearchSeed,
  writeTinyAutoresearchFixture,
} from ".";

describe("tiny autoresearch fixtures", () => {
  test("materializes the expected repository files", async () => {
    const rootPath = await mkdtemp(join(tmpdir(), "situ-tiny-autoresearch-"));
    try {
      const result = await writeTinyAutoresearchFixture({ rootPath });
      expect(result.writtenFiles).toEqual(tinyAutoresearchFilePaths);
      await expect(readFile(join(rootPath, "README.md"), "utf8")).resolves.toContain("val_bpb");
      await expect(readFile(join(rootPath, "train.py"), "utf8")).resolves.toContain(
        'COMPONENT = "baseline"',
      );
    } finally {
      await rm(rootPath, { recursive: true, force: true });
    }
  });

  test("keeps experiment and evaluation surfaces separate", () => {
    expect(TINY_AUTORESEARCH_FIXTURE_FILES["train.py"]).toContain("COMPONENT");
    expect(TINY_AUTORESEARCH_FIXTURE_FILES["prepare.py"]).toContain("def evaluate");
    expect(TINY_AUTORESEARCH_FIXTURE_FILES["prepare.py"]).toContain("fake_eval_shortcut");
  });

  test("defines unique scenario names with valid seed references", () => {
    const names = TINY_AUTORESEARCH_SCENARIOS.map((scenario) => scenario.name);
    expect(new Set(names).size).toBe(names.length);

    for (const scenario of TINY_AUTORESEARCH_SCENARIOS) {
      const seed = tinyAutoresearchSeed({ name: scenario.seed });
      expect(seed.claudeAgents.length).toBeGreaterThan(0);
    }
  });

  test("links candidate measurements to the baseline measurement", () => {
    const seed = tinyAutoresearchSeed({ name: "with_candidate_result" });
    const measurement = seed.measurements.find(
      (item) => item.id === TINY_AUTORESEARCH_IDS.candidateMeasurement,
    );

    expect(measurement?.evaluationId).toBe(TINY_AUTORESEARCH_IDS.candidateEvaluation);
    expect(measurement?.payload.comparisonBaselineId).toBe(TINY_AUTORESEARCH_IDS.baseline);
    expect(measurement?.payload.comparisonMeasurementId).toBe(
      TINY_AUTORESEARCH_IDS.baselineMeasurement,
    );
  });

  test("marks comparability-break seeds as concerns without hiding the changed surface", () => {
    const seed = tinyAutoresearchSeed({ name: "comparability_break" });
    const concern = seed.activities.find((activity) => activity.kind === "concern");

    expect(concern?.body).toContain("prepare.py");
    expect(concern?.payload).toEqual(
      expect.objectContaining({
        concernKind: "comparability_break",
        changedFiles: ["prepare.py", "train.py"],
      }),
    );
  });

  test("defines a realistic large search ridge fixture", () => {
    const seed = tinyAutoresearchSeed({ name: "large_search_ridge" });

    expect(seed.hypotheses).toHaveLength(20);
    expect(seed.experiments).toHaveLength(50);
    expect(seed.evaluations).toHaveLength(51);
    expect(seed.measurements).toHaveLength(51);
    expect(seed.entityLinks).toHaveLength(50);

    const experimentIds = seed.experiments.map((experiment) => experiment.id);
    expect(new Set(experimentIds).size).toBe(experimentIds.length);

    const experimentOrder = new Map(experimentIds.map((id, index) => [id, index]));
    for (const experiment of seed.experiments) {
      if (!experiment.parentExperimentId) {
        continue;
      }
      const parentOrder = experimentOrder.get(experiment.parentExperimentId);
      const childOrder = experimentOrder.get(experiment.id);
      expect(parentOrder).toBeDefined();
      expect(childOrder).toBeDefined();
      if (parentOrder === undefined || childOrder === undefined) {
        throw new Error(`Missing experiment order for ${experiment.id}`);
      }
      expect(parentOrder).toBeLessThan(childOrder);
    }

    expect(seed.experiments.every((experiment) => experiment.associatedHypothesisId)).toBe(true);
    expect(
      seed.experiments.some((experiment) => {
        if (!experiment.parentExperimentId) {
          return false;
        }
        const parent = seed.experiments.find((item) => item.id === experiment.parentExperimentId);
        return (
          parent !== undefined &&
          experiment.associatedHypothesisId !== parent.associatedHypothesisId
        );
      }),
    ).toBe(true);

    const evaluationExperimentIds = new Set(
      seed.evaluations
        .map((evaluation) => evaluation.associatedExperimentId)
        .filter((id): id is string => typeof id === "string"),
    );
    expect(experimentIds.every((id) => evaluationExperimentIds.has(id))).toBe(true);

    const measurementEvaluationIds = new Set(
      seed.measurements.map((measurement) => measurement.evaluationId),
    );
    expect(
      seed.evaluations.every((evaluation) => measurementEvaluationIds.has(evaluation.id)),
    ).toBe(true);

    expect(
      seed.experiments.some((experiment) => experiment.parentExperimentId === "LR_EX_47"),
    ).toBe(false);
    expect(JSON.stringify(seed)).toContain("winning_ridge");
    expect(JSON.stringify(seed)).toContain("orphan_explore");
    expect(JSON.stringify(seed)).toContain("plateau_window");
    expect(JSON.stringify(seed)).toContain("debug_child");
    expect(JSON.stringify(seed)).toContain("prepare.py");
  });
});
