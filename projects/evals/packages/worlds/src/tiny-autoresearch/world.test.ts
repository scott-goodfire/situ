import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { describe, expect, test } from "bun:test";

import { checkDurableState } from "./assertions";
import { createTinyAutoresearchWorld } from "./create-world";
import { readTinyAutoresearchDurableState } from "./durable-state";

describe("tiny autoresearch world", () => {
  test("materializes a migrated seeded world", async () => {
    const { world, cleanup } = await createTinyAutoresearchWorld({
      seedName: "with_candidate_result",
    });
    try {
      await expect(readFile(join(world.workspacePath, "README.md"), "utf8")).resolves.toContain(
        "Tiny Autoresearch Fixture",
      );
      const state = readTinyAutoresearchDurableState({ world });
      const result = checkDurableState({
        state,
        expectation: {
          minCounts: {
            session: 1,
            researchProjects: 1,
            researchTasks: 3,
            baselines: 1,
            experiments: 1,
            evaluations: 2,
            measurements: 2,
            artifacts: 2,
            entityLinks: 1,
          },
          requiredMarkers: ["component_a", "val_bpb", "component a against baseline"],
          requiredChangedFiles: ["train.py"],
          forbiddenChangedFiles: ["prepare.py"],
        },
      });
      expect(result).toEqual(
        expect.objectContaining({
          passed: true,
          missingCounts: [],
          missingMarkers: [],
          missingChangedFiles: [],
          forbiddenChangedFiles: [],
        }),
      );
    } finally {
      await cleanup();
    }
  });

  test("materializes the large search ridge graph", async () => {
    const { world, cleanup } = await createTinyAutoresearchWorld({
      seedName: "large_search_ridge",
    });
    try {
      const state = readTinyAutoresearchDurableState({ world });
      const result = checkDurableState({
        state,
        expectation: {
          minCounts: {
            session: 1,
            researchProjects: 1,
            researchTasks: 52,
            hypotheses: 20,
            baselines: 1,
            experiments: 50,
            evaluations: 51,
            measurements: 51,
            artifacts: 51,
            entityLinks: 50,
            activities: 52,
          },
          requiredMarkers: [
            "large_search_ridge",
            "LR_EX_47",
            "winning_ridge",
            "parent_experiment_id",
            "comparisonMeasurementId",
            "orphan_explore",
            "prepare.py",
          ],
          requiredChangedFiles: ["train.py", "prepare.py"],
        },
      });
      expect(result).toEqual(
        expect.objectContaining({
          passed: true,
          missingCounts: [],
          missingMarkers: [],
          missingChangedFiles: [],
          forbiddenChangedFiles: [],
        }),
      );

      const experimentsById = new Map(
        state.experiments.map((experiment) => [String(experiment.id), experiment]),
      );
      expect(experimentsById.get("LR_EX_47")?.parent_experiment_id).toBe("LR_EX_46");
      expect(
        state.experiments.some((experiment) => experiment.parent_experiment_id === "LR_EX_47"),
      ).toBe(false);
      expect(
        state.experiments.filter(
          (experiment) => typeof experiment.parent_experiment_id === "string",
        ).length,
      ).toBeGreaterThan(30);

      expect(
        state.experiments.some((experiment) => {
          const parentId = experiment.parent_experiment_id;
          if (typeof parentId !== "string") {
            return false;
          }
          return (
            experimentsById.get(String(parentId))?.associated_hypothesis_id !==
            experiment.associated_hypothesis_id
          );
        }),
      ).toBe(true);
    } finally {
      await cleanup();
    }
  });
});
