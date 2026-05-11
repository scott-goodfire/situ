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
        baselines: 2,
        evaluations: 1,
        measurements: 1,
        artifacts: 1,
      },
      requiredMarkers: [
        "project_setup",
        "val_bpb",
        "2.713",
        "baseline measurement",
        "verification_prompt",
      ],
    },
  },
  {
    name: "candidate seed preserves comparison lineage",
    seedName: "with_candidate_result",
    expected: {
      minCounts: {
        session: 1,
        hypotheses: 1,
        baselines: 2,
        experiments: 1,
        evaluations: 2,
        measurements: 2,
        artifacts: 2,
        entityLinks: 1,
      },
      requiredMarkers: [
        "project_setup",
        "component_a",
        "2.681",
        "comparisonMeasurementId",
        "worker_prompt",
      ],
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
        baselines: 2,
        experiments: 1,
        evaluations: 2,
        measurements: 2,
        activities: 3,
      },
      requiredMarkers: [
        "ResearchTaskVerification",
        "project_setup",
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
        baselines: 2,
        experiments: 50,
        evaluations: 51,
        measurements: 51,
        artifacts: 51,
        entityLinks: 50,
        activities: 53,
      },
      requiredMarkers: [
        "large_search_ridge",
        "project_setup",
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
  {
    name: "exploit drift lineage seeds five chained exploits and stranded triage",
    seedName: "exploit_drift_lineage",
    expected: {
      minCounts: {
        session: 1,
        claudeAgents: 3,
        researchProjects: 1,
        researchTasks: 7,
        hypotheses: 6,
        baselines: 1,
        experiments: 5,
        evaluations: 6,
        measurements: 6,
        artifacts: 6,
        entityLinks: 5,
      },
      requiredMarkers: [
        "exploit_drift_lineage",
        "EXP_DRIFT_EX_1",
        "EXP_DRIFT_EX_5",
        "EXP_DRIFT_H_POOLING",
        "EXP_DRIFT_H_TRIAGE_1",
        "mean-pooling",
        "val_bpb",
      ],
      requiredChangedFiles: ["train.py"],
      requiredParentExperimentIds: ["EXP_DRIFT_EX_1", "EXP_DRIFT_EX_4"],
      requiredAssociatedHypothesisIds: ["EXP_DRIFT_H_POOLING"],
      requiredResearchTaskTypes: ["explore", "exploit"],
    },
  },
  {
    name: "healthy exploit window seeds a fresh keep with no triage backlog",
    seedName: "healthy_exploit_window",
    expected: {
      minCounts: {
        session: 1,
        claudeAgents: 3,
        researchProjects: 1,
        researchTasks: 3,
        hypotheses: 1,
        baselines: 1,
        experiments: 1,
        evaluations: 2,
        measurements: 2,
        artifacts: 2,
        entityLinks: 1,
      },
      requiredMarkers: [
        "healthy_exploit_window",
        "HEALTHY_EXPLOIT_EX1",
        "HEALTHY_EXPLOIT_H_ACTIVE",
        "val_bpb",
        "2.681",
      ],
      requiredChangedFiles: ["train.py"],
      requiredAssociatedHypothesisIds: ["HEALTHY_EXPLOIT_H_ACTIVE"],
      requiredResearchTaskTypes: ["explore", "exploit"],
    },
  },
  {
    name: "two orthogonal wins seed preloads independent verified positives for the combiner",
    seedName: "two_orthogonal_wins_for_combiner",
    expected: {
      minCounts: {
        session: 1,
        claudeAgents: 3,
        researchProjects: 1,
        researchTasks: 4,
        hypotheses: 2,
        baselines: 2,
        experiments: 2,
        evaluations: 3,
        measurements: 3,
        artifacts: 3,
        entityLinks: 2,
      },
      requiredMarkers: [
        "two_orthogonal_wins_for_combiner",
        "ORTHO_WINS_EX_POOLING",
        "ORTHO_WINS_EX_VOCAB",
        "ORTHO_WINS_H_POOLING",
        "ORTHO_WINS_H_VOCAB",
        "val_bpb",
        "2.681",
        "2.689",
      ],
      requiredChangedFiles: ["train.py"],
      requiredAssociatedHypothesisIds: ["ORTHO_WINS_H_POOLING", "ORTHO_WINS_H_VOCAB"],
      requiredResearchTaskTypes: ["explore", "exploit"],
    },
  },
  {
    name: "exploit drift with mixed triage splits same-axis and different-axis hypotheses",
    seedName: "exploit_drift_with_mixed_triage",
    expected: {
      minCounts: {
        session: 1,
        claudeAgents: 3,
        researchProjects: 1,
        researchTasks: 7,
        hypotheses: 6,
        baselines: 1,
        experiments: 5,
        evaluations: 6,
        measurements: 6,
        artifacts: 6,
        entityLinks: 5,
      },
      requiredMarkers: [
        "exploit_drift_with_mixed_triage",
        "EXP_DRIFT_MIX_H_POOLING",
        "EXP_DRIFT_MIX_H_VARIANT_MAX",
        "EXP_DRIFT_MIX_H_VARIANT_SUM",
        "EXP_DRIFT_MIX_H_VOCAB",
        "EXP_DRIFT_MIX_H_CONTEXT",
        "EXP_DRIFT_MIX_H_EMBED",
        "same pooling parameter family",
        "different parameter from pooling",
      ],
      requiredChangedFiles: ["train.py"],
      requiredParentExperimentIds: ["EXP_DRIFT_MIX_EX_1", "EXP_DRIFT_MIX_EX_4"],
      requiredAssociatedHypothesisIds: ["EXP_DRIFT_MIX_H_POOLING"],
      requiredResearchTaskTypes: ["explore", "exploit"],
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
