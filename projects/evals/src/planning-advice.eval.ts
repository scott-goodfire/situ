import Anthropic from "@anthropic-ai/sdk";
import { evalite } from "evalite";

import { getAnthropicKey } from "../../app/src/secrets/local-secret-store";
import {
  PLANNING_ADVICE_MODEL,
  parsePlanningAdvice,
  type PlanningAdvice,
} from "../../app/src/claude/agents/tools/__shared__/planning-advice-types";
import { planningAdviceSystemPrompt } from "../../app/src/claude/agents/tools/__shared__/planning-advice-prompt";

type Diversity = PlanningAdvice["diversity"];
type BranchStatus = PlanningAdvice["activeBranches"][number]["status"];

type CaseExpectation = Readonly<{
  diversity: readonly Diversity[];
  branchStatus?: readonly BranchStatus[];
  suggestionMarkers?: readonly string[];
  suggestionAnyOfMarkers?: readonly string[];
  forbiddenSuggestionMarkers?: readonly string[];
}>;

type PlanningAdviceCase = Readonly<{
  name: string;
  snapshot: string;
  expectation: CaseExpectation;
}>;

const tinyAutoresearchGoal = "Lower val_bpb without changing the evaluation surface.";

const concentratedExhaustedSnapshot = `Project goal: ${tinyAutoresearchGoal}
Phase: search.

Active hypothesis branches:

  Branch H_POOLING — "Mean pooling over CLS token improves val_bpb"
  Summary: Pooling over all tokens instead of relying on the CLS token may lower val_bpb without changing the evaluation surface.
  Experiments (oldest to newest):
    EX_1 · "Mean-pooling variant 1" · EX_1 continues the mean-pooling lineage from baseline; val_bpb=2.681.
    EX_2 · "Mean-pooling variant 2" · EX_2 continues the mean-pooling lineage from EX_1; val_bpb=2.674.
    EX_3 · "Mean-pooling variant 3" · EX_3 continues the mean-pooling lineage from EX_2; val_bpb=2.671.
    EX_4 · "Mean-pooling variant 4" · EX_4 continues the mean-pooling lineage from EX_3; val_bpb=2.671.
    EX_5 · "Mean-pooling variant 5" · EX_5 continues the mean-pooling lineage from EX_4; val_bpb=2.670.

Recent verified tasks (oldest first):
  exploit · "Deepen mean-pooling variant 1" · hypothesis H_POOLING
  exploit · "Deepen mean-pooling variant 2" · hypothesis H_POOLING
  exploit · "Deepen mean-pooling variant 3" · hypothesis H_POOLING
  exploit · "Deepen mean-pooling variant 4" · hypothesis H_POOLING
  exploit · "Deepen mean-pooling variant 5" · hypothesis H_POOLING

Triage hypotheses (untested):
  H_VARIANT_MAX · "Max pooling over CLS token" · varies the same pooling parameter family as the active mean-pooling branch.
  H_VARIANT_SUM · "Sum pooling over CLS token" · varies the same pooling parameter family as the active mean-pooling branch.
  H_VOCAB · "Wider vocabulary" · varies a different parameter from pooling.
  H_CONTEXT · "Longer context window" · varies a different parameter from pooling.
  H_EMBED · "Tied embedding weights" · varies a different parameter from pooling.`;

const healthySpreadSnapshot = `Project goal: ${tinyAutoresearchGoal}
Phase: search.

Active hypothesis branches:

  Branch H_POOLING — "Mean pooling over CLS token improves val_bpb"
  Summary: Pooling over all tokens may lower val_bpb.
  Experiments (oldest to newest):
    EX_P1 · "Mean-pooling variant 1" · val_bpb=2.681.
    EX_P2 · "Mean-pooling variant 2" · val_bpb=2.652.

  Branch H_VOCAB — "Wider vocabulary improves val_bpb"
  Summary: Increasing vocabulary may reduce out-of-vocab penalty.
  Experiments (oldest to newest):
    EX_V1 · "Wider vocabulary attempt 1" · val_bpb=2.701.
    EX_V2 · "Wider vocabulary attempt 2" · val_bpb=2.659.

  Branch H_CONTEXT — "Longer context window improves val_bpb"
  Summary: Longer windows may capture more dependencies.
  Experiments (oldest to newest):
    EX_C1 · "Longer context attempt 1" · val_bpb=2.689.

Recent verified tasks (oldest first):
  exploit · "Try mean-pooling variant 1" · hypothesis H_POOLING
  explore · "Try wider vocabulary 1" · hypothesis H_VOCAB
  exploit · "Try mean-pooling variant 2" · hypothesis H_POOLING
  explore · "Try wider vocabulary 2" · hypothesis H_VOCAB
  explore · "Try longer context window 1" · hypothesis H_CONTEXT

Triage hypotheses (untested):
  (none)`;

const freshKeepSnapshot = `Project goal: ${tinyAutoresearchGoal}
Phase: search.

Active hypothesis branches:

  Branch H_POOLING — "Mean pooling over CLS token improves val_bpb"
  Summary: Pooling over all tokens may lower val_bpb.
  Experiments (oldest to newest):
    EX_1 · "Mean pooling first try" · val_bpb=2.681 (baseline was 2.713).

Recent verified tasks (oldest first):
  exploit · "Try mean pooling variant" · hypothesis H_POOLING

Triage hypotheses (untested):
  (none)`;

const midRunStrandedSnapshot = `Project goal: ${tinyAutoresearchGoal}
Phase: search.

Active hypothesis branches:

  Branch H_POOLING — "Mean pooling over CLS token improves val_bpb"
  Summary: Pooling over all tokens may lower val_bpb.
  Experiments (oldest to newest):
    EX_P1 · "Mean-pooling variant 1" · val_bpb=2.681.
    EX_P2 · "Mean-pooling variant 2" · val_bpb=2.674.
    EX_P3 · "Mean-pooling variant 3" · val_bpb=2.671.
    EX_P4 · "Mean-pooling variant 4" · val_bpb=2.670.
    EX_P5 · "Mean-pooling variant 5" · val_bpb=2.670.

  Branch H_OPTIMIZER — "Tuned optimizer schedule"
  Summary: Adjusting LR schedule may improve val_bpb.
  Experiments (oldest to newest):
    EX_O1 · "Optimizer schedule 1" · val_bpb=2.689.
    EX_O2 · "Optimizer schedule 2" · val_bpb=2.683.
    EX_O3 · "Optimizer schedule 3" · val_bpb=2.681.
    EX_O4 · "Optimizer schedule 4" · val_bpb=2.681.
    EX_O5 · "Optimizer schedule 5" · val_bpb=2.681.

Recent verified tasks (oldest first):
  exploit · "Mean-pooling variant 4" · hypothesis H_POOLING
  exploit · "Optimizer schedule 4" · hypothesis H_OPTIMIZER
  exploit · "Mean-pooling variant 5" · hypothesis H_POOLING
  exploit · "Optimizer schedule 5" · hypothesis H_OPTIMIZER

Triage hypotheses (untested):
  H_VOCAB · "Wider vocabulary" · untested; baseline analysis flagged it.
  H_CONTEXT · "Longer context window" · untested; logbook precedent.
  H_EMBED · "Tied embedding weights" · untested.
  H_INIT · "Different weight init" · untested.
  H_BATCH · "Larger batch size" · untested.`;

const cases: readonly PlanningAdviceCase[] = [
  {
    name: "concentrated_exhausted",
    snapshot: concentratedExhaustedSnapshot,
    expectation: {
      diversity: ["low"],
      branchStatus: ["exhausted"],
      suggestionMarkers: ["explore"],
    },
  },
  {
    name: "healthy_spread",
    snapshot: healthySpreadSnapshot,
    expectation: {
      diversity: ["broad", "mixed"],
      branchStatus: ["fresh", "diminishing"],
      forbiddenSuggestionMarkers: ["stranded"],
    },
  },
  {
    name: "fresh_keep",
    snapshot: freshKeepSnapshot,
    expectation: {
      diversity: ["mixed", "broad"],
      branchStatus: ["fresh"],
      forbiddenSuggestionMarkers: ["exhausted"],
    },
  },
  {
    name: "mid_run_stranded",
    snapshot: midRunStrandedSnapshot,
    expectation: {
      diversity: ["low"],
      suggestionAnyOfMarkers: ["triage", "widen", "unrelated", "different"],
    },
  },
];

async function callPlanningAdvisor({
  client,
  snapshot,
}: {
  client: Anthropic;
  snapshot: string;
}): Promise<PlanningAdvice | null> {
  const response = await client.messages.create({
    model: PLANNING_ADVICE_MODEL,
    max_tokens: 1024,
    system: [
      {
        type: "text",
        text: planningAdviceSystemPrompt,
        cache_control: { type: "ephemeral" },
      },
    ],
    messages: [{ role: "user", content: snapshot }],
  });
  for (const block of response.content) {
    if (block.type === "text") {
      return parsePlanningAdvice({ text: block.text });
    }
  }
  return null;
}

type ScoreOutput = Readonly<{
  advice: PlanningAdvice | null;
  expectation: CaseExpectation;
}>;

const planningAdviceScorer = {
  name: "planning-advice",
  description:
    "Inner planning advisor returns expected diversity, branch status, and suggestion markers.",
  scorer: ({ output }: { output: ScoreOutput }) => {
    const { advice, expectation } = output;
    const failures: string[] = [];
    if (!advice) {
      return { score: 0, metadata: { failures: ["parse failed or empty response"] } };
    }
    if (!expectation.diversity.includes(advice.diversity)) {
      failures.push(`diversity=${advice.diversity} not in ${expectation.diversity.join("|")}`);
    }
    if (expectation.branchStatus) {
      const allowed = new Set(expectation.branchStatus);
      const offenders = advice.activeBranches.filter((branch) => !allowed.has(branch.status));
      if (advice.activeBranches.length === 0) {
        failures.push("no activeBranches in advice");
      } else if (offenders.length === advice.activeBranches.length) {
        failures.push(
          `no branch had a status in ${expectation.branchStatus.join("|")} (got ${advice.activeBranches
            .map((b) => b.status)
            .join(", ")})`,
        );
      }
    }
    const suggestionLower = advice.suggestion.toLowerCase();
    for (const marker of expectation.suggestionMarkers ?? []) {
      if (!suggestionLower.includes(marker.toLowerCase())) {
        failures.push(`suggestion missing marker "${marker}"`);
      }
    }
    if (expectation.suggestionAnyOfMarkers && expectation.suggestionAnyOfMarkers.length > 0) {
      const hit = expectation.suggestionAnyOfMarkers.some((marker) =>
        suggestionLower.includes(marker.toLowerCase()),
      );
      if (!hit) {
        failures.push(
          `suggestion missing any of [${expectation.suggestionAnyOfMarkers.join(", ")}]`,
        );
      }
    }
    for (const marker of expectation.forbiddenSuggestionMarkers ?? []) {
      if (suggestionLower.includes(marker.toLowerCase())) {
        failures.push(`suggestion contains forbidden marker "${marker}"`);
      }
    }
    return {
      score: failures.length === 0 ? 1 : 0,
      metadata: { failures, advice },
    };
  },
};

evalite("planning advice inner prompt", {
  data: async () => {
    const apiKey = await getAnthropicKey();
    if (!apiKey) {
      throw new Error(
        "planning-advice eval requires SITU_ANTHROPIC_KEY or ~/.situ/secrets.json to be set.",
      );
    }
    return cases.map((evalCase) => ({
      input: evalCase,
      expected: evalCase.expectation,
    }));
  },
  task: async (input: PlanningAdviceCase): Promise<ScoreOutput> => {
    const apiKey = await getAnthropicKey();
    if (!apiKey) {
      throw new Error("Anthropic key unavailable.");
    }
    const client = new Anthropic({ apiKey });
    const advice = await callPlanningAdvisor({ client, snapshot: input.snapshot });
    return { advice, expectation: input.expectation };
  },
  scorers: [planningAdviceScorer],
});
