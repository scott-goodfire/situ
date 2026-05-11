import { describe, expect, test } from "bun:test";

import {
  fallbackPlanningAdvice,
  formatPlanningSnapshot,
  getPlanningAdviceTool,
  parsePlanningAdvice,
  planningAdviceSchema,
  type PlanningSnapshot,
} from "./get-planning-advice";

const fixtureSnapshot: PlanningSnapshot = {
  goal: "Lower val_bpb without changing the evaluation surface.",
  phase: "search",
  recentVerifiedTasks: [
    {
      id: "T1",
      type: "exploit",
      title: "Deepen mean-pooling variant 1",
      targetKind: "hypothesis",
      targetId: "H_POOLING",
    } as PlanningSnapshot["recentVerifiedTasks"][number],
  ],
  activeBranches: [
    {
      hypothesisId: "H_POOLING",
      title: "Mean pooling over CLS token improves val_bpb",
      summary: "Pooling over all tokens may lower val_bpb.",
      experiments: [
        {
          id: "EX_1",
          title: "Mean-pooling variant 1",
          summary: "EX_1 continues the mean-pooling lineage from baseline; val_bpb=2.681.",
        },
      ],
    },
  ],
  triageHypotheses: [
    {
      id: "H_TRIAGE_1",
      title: "Wider vocabulary",
      summary: "Untested idea from baseline analysis.",
    },
  ],
};

describe("get_planning_advice tool", () => {
  test("registers under the manager role with the expected name", () => {
    expect(getPlanningAdviceTool.name).toBe("get_planning_advice");
    expect(getPlanningAdviceTool.roles).toContain("manager");
  });
});

describe("planningAdviceSchema", () => {
  test("accepts the documented shape", () => {
    const parsed = planningAdviceSchema.parse({
      diversity: "low",
      summary: "All recent work was on one branch.",
      activeBranches: [
        {
          hypothesisId: "H_POOLING",
          title: "Mean pooling",
          recentExperiments: 5,
          status: "exhausted",
          statusNote: "Last three deltas under noise floor.",
        },
      ],
      strandedTriage: [
        {
          hypothesisId: "H_TRIAGE_1",
          title: "Wider vocabulary",
          evidenceNote: "From baseline analysis.",
          relevanceToExhausted: "Different axis — unrelated to pooling.",
        },
      ],
      suggestion: "Promote H_TRIAGE_1 to an explore task.",
    });
    expect(parsed.diversity).toBe("low");
    expect(parsed.activeBranches[0].status).toBe("exhausted");
    expect(parsed.strandedTriage[0].relevanceToExhausted).toContain("Different axis");
  });

  test("rejects an unknown diversity value", () => {
    expect(() =>
      planningAdviceSchema.parse({
        diversity: "unknown",
        summary: "",
        activeBranches: [],
        strandedTriage: [],
        suggestion: "",
      }),
    ).toThrow();
  });
});

describe("formatPlanningSnapshot", () => {
  test("renders recent tasks and triage hypotheses as readable lines", () => {
    const text = formatPlanningSnapshot({ snapshot: fixtureSnapshot });
    expect(text).toContain("Project goal: Lower val_bpb");
    expect(text).toContain('exploit · "Deepen mean-pooling variant 1"');
    expect(text).toContain("hypothesis H_POOLING");
    expect(text).toContain('H_TRIAGE_1 · "Wider vocabulary"');
  });

  test("renders the active hypothesis branches with their experiments", () => {
    const text = formatPlanningSnapshot({ snapshot: fixtureSnapshot });
    expect(text).toContain('Branch H_POOLING — "Mean pooling over CLS token improves val_bpb"');
    expect(text).toContain("Experiments (oldest to newest):");
    expect(text).toContain("EX_1");
    expect(text).toContain("val_bpb=2.681");
  });

  test("handles an empty snapshot gracefully", () => {
    const text = formatPlanningSnapshot({
      snapshot: {
        ...fixtureSnapshot,
        recentVerifiedTasks: [],
        activeBranches: [],
        triageHypotheses: [],
      },
    });
    expect(text).toContain("Active hypothesis branches:\n  (none)");
    expect(text).toContain("Recent verified tasks (oldest first):\n  (none)");
    expect(text).toContain("Triage hypotheses (untested):\n  (none)");
  });
});

describe("parsePlanningAdvice", () => {
  const validJson = JSON.stringify({
    diversity: "low",
    summary: "All recent work was on one branch.",
    activeBranches: [
      {
        hypothesisId: "H_POOLING",
        title: "Mean pooling",
        recentExperiments: 5,
        status: "exhausted",
        statusNote: "Last three deltas under noise floor.",
      },
    ],
    strandedTriage: [
      {
        hypothesisId: "H_TRIAGE_1",
        title: "Wider vocabulary",
        evidenceNote: "From baseline analysis.",
      },
    ],
    suggestion: "Promote H_TRIAGE_1 to an explore task.",
  });

  test("parses well-formed JSON", () => {
    const advice = parsePlanningAdvice({ text: validJson });
    expect(advice?.diversity).toBe("low");
    expect(advice?.activeBranches.length).toBe(1);
  });

  test("tolerates JSON wrapped in prose or code fences", () => {
    const wrapped = `Here's my reply:\n\`\`\`json\n${validJson}\n\`\`\`\nDone.`;
    const advice = parsePlanningAdvice({ text: wrapped });
    expect(advice?.diversity).toBe("low");
  });

  test("returns null for malformed JSON", () => {
    expect(parsePlanningAdvice({ text: "" })).toBeNull();
    expect(parsePlanningAdvice({ text: "not even close" })).toBeNull();
    expect(parsePlanningAdvice({ text: "{ broken json" })).toBeNull();
  });

  test("returns null when the shape is wrong", () => {
    expect(
      parsePlanningAdvice({
        text: JSON.stringify({ diversity: "ridiculous" }),
      }),
    ).toBeNull();
  });
});

describe("fallbackPlanningAdvice", () => {
  test("returns a schema-valid advisory", () => {
    const advice = fallbackPlanningAdvice();
    expect(() => planningAdviceSchema.parse(advice)).not.toThrow();
    expect(advice.activeBranches).toEqual([]);
    expect(advice.strandedTriage).toEqual([]);
  });
});
