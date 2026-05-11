import { evalite } from "evalite";

import { findExploitShapeTokens } from "../../app/src/claude/agents/tools/__shared__/explore-task-shape";

type Case = {
  readonly name: string;
  readonly workerPrompt: string;
  readonly expected: {
    readonly shouldMatch: boolean;
    readonly mustContain: readonly string[];
    readonly note: string;
  };
};

const cases: Case[] = [
  {
    name: "misfile: capture + record exploit verbs in explore prompt",
    workerPrompt:
      "Apply the helper change in train.py, then call capture_experiment_candidate, then record_experiment_comparison against the baseline. Verify the candidate beats baseline on val_bpb.",
    expected: {
      shouldMatch: true,
      mustContain: ["capture_experiment_candidate", "record_experiment_comparison"],
      note: "Real misfiling pattern (6fd6ca35-style). Manager wrote an exploit recipe under type: explore.",
    },
  },
  {
    name: "misfile: hard reset + exploit tool",
    workerPrompt:
      "Run python harness.py to capture baseline, then apply candidate.diff and git reset --hard HEAD~1 if the run fails, then call submit_experiment.",
    expected: {
      shouldMatch: true,
      mustContain: ["git reset --hard", "submit_experiment"],
      note: "Real misfiling pattern (2c79a66e-style). Mutating shell + exploit tool inside explore.",
    },
  },
  {
    name: "misfile: git commit -am only",
    workerPrompt:
      "Edit train.py to lower the learning rate to 1e-4 and git commit -am 'lr sweep' so the candidate is captured.",
    expected: {
      shouldMatch: true,
      mustContain: ["git commit -am"],
      note: "Lone exploit verb is still enough to refuse.",
    },
  },
  {
    name: "misfile: create_experiment named in prose",
    workerPrompt:
      "Try the candidate idea: create_experiment with the proposed change, run train, and report metrics.",
    expected: {
      shouldMatch: true,
      mustContain: ["create_experiment"],
      note: "Direct tool name reference. No legitimate explore would name this.",
    },
  },
  {
    name: "legit: read-only git inspection",
    workerPrompt:
      "Inspect the last 20 commits in main using git log --oneline and summarize what changed in the training loop. Identify any commit that may have introduced the val_bpb regression.",
    expected: {
      shouldMatch: false,
      mustContain: [],
      note: "Mentions 'git' but only in read-only verbs (log). Must not false-positive.",
    },
  },
  {
    name: "legit: discusses experiments without taking action",
    workerPrompt:
      "List existing experiments and hypotheses for the project; identify the three with the largest val_bpb gap; write a one-paragraph summary per experiment.",
    expected: {
      shouldMatch: false,
      mustContain: [],
      note: "Mentions 'experiment' (a word, not a tool name) but no exploit tool names. Must not false-positive.",
    },
  },
  {
    name: "legit: pure code reading and synthesis",
    workerPrompt:
      "Read projects/app/src/runtime/automation/runner.ts and write a one-paragraph summary of the work-item claim path. Cite three line numbers.",
    expected: {
      shouldMatch: false,
      mustContain: [],
      note: "Pure read-only explore work. Zero exploit signal.",
    },
  },
];

evalite("explore-task shape validator", {
  data: () =>
    cases.map((aCase) => ({
      input: aCase.workerPrompt,
      expected: aCase.expected,
      meta: { name: aCase.name },
    })),
  task: async (workerPrompt: string) => findExploitShapeTokens({ workerPrompt }),
  scorers: [
    {
      name: "hit-rate",
      description:
        "Misfilings: every expected token is detected. Legitimate explores: detector stays silent.",
      scorer: ({ output, expected }: { output: string[]; expected: Case["expected"] }) => {
        if (!expected.shouldMatch) {
          return {
            score: output.length === 0 ? 1 : 0,
            metadata: {
              falsePositiveTokens: output,
              note: expected.note,
            },
          };
        }
        const missing = expected.mustContain.filter((token) => !output.includes(token));
        return {
          score: missing.length === 0 && output.length > 0 ? 1 : 0,
          metadata: {
            matchedTokens: output,
            missingExpectedTokens: missing,
            note: expected.note,
          },
        };
      },
    },
  ],
});
