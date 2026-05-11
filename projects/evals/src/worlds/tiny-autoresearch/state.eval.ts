import { evalite } from "evalite";

import {
  TINY_AUTORESEARCH_SCENARIOS,
  tinyAutoresearchScenario,
  type TinyAutoresearchSeedName,
} from "@situ/evals-fixtures/tiny-autoresearch";

import {
  durableStateScorer,
  type DurableStateEvalExpected,
} from "../../scorers/durable-state-scorer";
import { markerScorer } from "../../scorers/marker-scorer";
import { runWorldStateBridge } from "./bridge";

type DurableFixtureCase = Readonly<{
  name: string;
  seedName: TinyAutoresearchSeedName;
  expected: DurableStateEvalExpected;
}>;

const durableFixtureCases: DurableFixtureCase[] = [
  {
    name: "empty repo has only session bootstrap state",
    seedName: "empty_repo",
    expected: {
      minCounts: {
        session: 1,
        claudeAgents: 3,
        researchProjects: 1,
        researchTasks: 1,
      },
      requiredMarkers: [
        "python train.py",
        "tiny autoresearch",
        "worker_prompt",
        "verification_prompt",
      ],
    },
  },
  {
    name: "baseline seed has linked measurement evidence",
    seedName: "with_baseline_result",
    expected: {
      minCounts: {
        session: 1,
        hypotheses: 1,
        baselines: 1,
        evaluations: 1,
        measurements: 1,
        artifacts: 1,
      },
      requiredMarkers: ["val_bpb", "2.713", "baseline measurement", "verification_prompt"],
    },
  },
  {
    name: "candidate seed preserves comparison lineage",
    seedName: "with_candidate_result",
    expected: {
      minCounts: {
        session: 1,
        hypotheses: 1,
        baselines: 1,
        experiments: 1,
        evaluations: 2,
        measurements: 2,
        artifacts: 2,
        entityLinks: 1,
      },
      requiredMarkers: ["component_a", "2.681", "comparisonMeasurementId", "worker_prompt"],
      requiredChangedFiles: ["train.py"],
      forbiddenChangedFiles: ["prepare.py"],
    },
  },
  {
    name: "comparability seed exposes the trust concern",
    seedName: "comparability_break",
    expected: {
      minCounts: {
        session: 1,
        hypotheses: 1,
        baselines: 1,
        experiments: 1,
        evaluations: 2,
        measurements: 2,
        activities: 3,
      },
      requiredMarkers: [
        "ResearchTaskVerification",
        "comparability_break",
        "prepare.py",
        "evaluation surface",
        "managerReaction",
        "verifier",
      ],
      requiredChangedFiles: ["prepare.py", "train.py"],
    },
  },
  {
    name: "large search ridge seed preserves crowded search topology",
    seedName: "large_search_ridge",
    expected: {
      minCounts: {
        session: 1,
        claudeAgents: 3,
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
        "frontier",
        "plateau_window",
        "debug_child",
        "parent_experiment_id",
        "comparisonMeasurementId",
        "orphan_explore",
        "prepare.py",
      ],
      requiredChangedFiles: ["prepare.py", "train.py"],
      requiredParentExperimentIds: ["LR_EX_02", "LR_EX_36", "LR_EX_42", "LR_EX_46"],
      requiredAssociatedHypothesisIds: ["LR_H01", "LR_H18", "LR_H20"],
      requiredResearchTaskTypes: ["explore", "exploit", "debug"],
    },
  },
];

evalite("tiny autoresearch scenario fixtures", {
  data: TINY_AUTORESEARCH_SCENARIOS.map((scenario) => ({
    input: scenario.name,
    expected: {
      required: [
        scenario.name,
        scenario.seed,
        ...scenario.expectation.requiredOutputMarkers,
        ...scenario.expectation.requiredProjectMarkers,
      ],
    },
  })),
  task: (input) => {
    const scenario = tinyAutoresearchScenario({ name: input });
    return JSON.stringify(scenario);
  },
  scorers: [markerScorer],
});

evalite("tiny autoresearch durable fixture worlds", {
  data: durableFixtureCases.map((item) => ({
    input: item,
    expected: item.expected,
  })),
  task: async (input) => {
    return runWorldStateBridge({
      seedName: input.seedName,
    });
  },
  scorers: [durableStateScorer],
});
