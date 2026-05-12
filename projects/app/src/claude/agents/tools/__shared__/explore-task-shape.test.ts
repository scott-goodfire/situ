import { describe, expect, test } from "bun:test";

import { findExploitShapeTokens, type ExploitShapeToken } from "./explore-task-shape";

type ExploreShapeCase = {
  readonly name: string;
  readonly workerPrompt: string;
  readonly expected:
    | {
        readonly shouldMatch: true;
        readonly mustContain: readonly ExploitShapeToken[];
      }
    | {
        readonly shouldMatch: false;
      };
};

const cases: ExploreShapeCase[] = [
  {
    name: "misfile: capture + record exploit verbs in explore prompt",
    workerPrompt:
      "Apply the helper change in train.py, then call capture_experiment_candidate, then record_experiment_comparison against the baseline. Verify the candidate beats baseline on val_bpb.",
    expected: {
      shouldMatch: true,
      mustContain: ["capture_experiment_candidate", "record_experiment_comparison"],
    },
  },
  {
    name: "misfile: hard reset + exploit tool",
    workerPrompt:
      "Run python harness.py to capture baseline, then apply candidate.diff and git reset --hard HEAD~1 if the run fails, then call submit_experiment.",
    expected: {
      shouldMatch: true,
      mustContain: ["git reset --hard", "submit_experiment"],
    },
  },
  {
    name: "misfile: git commit -am only",
    workerPrompt:
      "Edit train.py to lower the learning rate to 1e-4 and git commit -am 'lr sweep' so the candidate is captured.",
    expected: {
      shouldMatch: true,
      mustContain: ["git commit -am"],
    },
  },
  {
    name: "misfile: create_experiment named in prose",
    workerPrompt:
      "Try the candidate idea: create_experiment with the proposed change, run train, and report metrics.",
    expected: {
      shouldMatch: true,
      mustContain: ["create_experiment"],
    },
  },
  {
    name: "legit: read-only git inspection",
    workerPrompt:
      "Inspect the last 20 commits in main using git log --oneline and summarize what changed in the training loop. Identify any commit that may have introduced the val_bpb regression.",
    expected: {
      shouldMatch: false,
    },
  },
  {
    name: "legit: discusses experiments without taking action",
    workerPrompt:
      "List existing experiments and hypotheses for the project; identify the three with the largest val_bpb gap; write a one-paragraph summary per experiment.",
    expected: {
      shouldMatch: false,
    },
  },
  {
    name: "legit: pure code reading and synthesis",
    workerPrompt:
      "Read projects/app/src/runtime/automation/runner.ts and write a one-paragraph summary of the work-item claim path. Cite three line numbers.",
    expected: {
      shouldMatch: false,
    },
  },
];

describe("findExploitShapeTokens", () => {
  test.each(cases.map((c) => [c.name, c] as const))("%s", (_name, evalCase) => {
    const matched = findExploitShapeTokens({ workerPrompt: evalCase.workerPrompt });
    if (evalCase.expected.shouldMatch) {
      expect(matched.length).toBeGreaterThan(0);
      for (const expectedToken of evalCase.expected.mustContain) {
        expect(matched).toContain(expectedToken);
      }
    } else {
      expect(matched).toEqual([]);
    }
  });
});
