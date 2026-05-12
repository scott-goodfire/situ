import { describe, expect, test } from "bun:test";

import type { ResearchTaskRecord } from "../../../data/repositories/research-tasks";
import {
  SEARCH_BALANCE_SIGNAL_WINDOW,
  VERIFIER_LINEAGE_NOISE_FLOOR_DEPTH,
  searchBalanceSignalLines,
  verifierResearchTaskPrompt,
  type VerifierLineageAncestor,
} from "./prompts";

describe("searchBalanceSignalLines", () => {
  test("reports an empty-state line when the project has no ResearchTasks yet", () => {
    const lines = searchBalanceSignalLines({ tasks: [] });
    expect(lines).toEqual(["- No ResearchTasks recorded yet for this project."]);
  });

  test("tallies the most recent N task types and counts tasks since the last explore", () => {
    const tasks = [
      task({ id: "t1", type: "explore", createdAt: "2026-01-01T00:00:00.000Z" }),
      task({ id: "t2", type: "exploit", createdAt: "2026-01-01T00:01:00.000Z" }),
      task({ id: "t3", type: "exploit", createdAt: "2026-01-01T00:02:00.000Z" }),
      task({ id: "t4", type: "exploit", createdAt: "2026-01-01T00:03:00.000Z" }),
      task({ id: "t5", type: "exploit", createdAt: "2026-01-01T00:04:00.000Z" }),
    ];
    const lines = searchBalanceSignalLines({ tasks });
    expect(lines[0]).toBe("- Recent task type tally (last 5, of 5 total): exploit=4, explore=1.");
    expect(lines[1]).toBe(
      "- Tasks since the last explore: 4 (greedy-exploit collapse risk rises after four or five; plan an explore before another exploit when this climbs).",
    );
  });

  test("calls out the case where no explore task has ever been recorded", () => {
    const tasks = [
      task({ id: "t1", type: "exploit", createdAt: "2026-01-01T00:00:00.000Z" }),
      task({ id: "t2", type: "exploit", createdAt: "2026-01-01T00:01:00.000Z" }),
    ];
    const lines = searchBalanceSignalLines({ tasks });
    expect(lines[1]).toBe(
      "- No explore task has ever been recorded in this project (2 non-explore tasks so far).",
    );
  });

  test("clamps the recent window to SEARCH_BALANCE_SIGNAL_WINDOW", () => {
    const tasks = Array.from({ length: SEARCH_BALANCE_SIGNAL_WINDOW + 5 }, (_unused, index) =>
      task({
        id: `t${index}`,
        type: index === 0 ? "explore" : "exploit",
        createdAt: `2026-01-01T00:${String(index).padStart(2, "0")}:00.000Z`,
      }),
    );
    const lines = searchBalanceSignalLines({ tasks });
    expect(lines[0]).toContain(`last ${SEARCH_BALANCE_SIGNAL_WINDOW}`);
    expect(lines[0]).toContain(`of ${tasks.length} total`);
  });
});

describe("verifierResearchTaskPrompt lineage block", () => {
  test("renders a no-lineage line when no ancestors are passed", () => {
    const prompt = verifierResearchTaskPrompt({ researchTask: verifierTask(), lineage: [] });
    expect(prompt).toContain("Lineage:\n- No parent experiment chain for this candidate.");
  });

  test("renders ancestor chain with depth, ids, status, title, and commit", () => {
    const lineage: VerifierLineageAncestor[] = [
      ancestor({
        experimentId: "exp_anchor_b",
        title: "first+last anchor cascading fallback",
        status: "accepted",
        candidateCommit: "7c46d73",
      }),
      ancestor({
        experimentId: "exp_anchor_a",
        title: "anchor + extra-vocab fallback stacked",
        status: "accepted",
        candidateCommit: "f6fed76",
      }),
    ];
    const prompt = verifierResearchTaskPrompt({ researchTask: verifierTask(), lineage });
    expect(prompt).toContain("Lineage:\n- This candidate sits 3 deep in its exploit chain");
    expect(prompt).toContain(
      "1. exp_anchor_b (accepted) — first+last anchor cascading fallback @ 7c46d73",
    );
    expect(prompt).toContain(
      "2. exp_anchor_a (accepted) — anchor + extra-vocab fallback stacked @ f6fed76",
    );
  });

  test("the long-chain noise-floor instruction names the configured depth", () => {
    const prompt = verifierResearchTaskPrompt({ researchTask: verifierTask(), lineage: [] });
    expect(prompt).toContain(`${VERIFIER_LINEAGE_NOISE_FLOOR_DEPTH}+ rungs deep`);
  });
});

function verifierTask(overrides: Partial<ResearchTaskRecord> = {}): ResearchTaskRecord {
  return task({
    id: overrides.id ?? "t_verify",
    type: overrides.type ?? "exploit",
    createdAt: overrides.createdAt ?? "2026-01-01T00:00:00.000Z",
    ...overrides,
  });
}

function ancestor(input: VerifierLineageAncestor): VerifierLineageAncestor {
  return input;
}

function task(
  overrides: Partial<ResearchTaskRecord> & Pick<ResearchTaskRecord, "id" | "type" | "createdAt">,
): ResearchTaskRecord {
  return {
    id: overrides.id,
    researchProjectId: "proj_test",
    parentResearchTaskId: null,
    type: overrides.type,
    title: overrides.title ?? "Task",
    workerPrompt: overrides.workerPrompt ?? "do the thing",
    verificationPrompt: overrides.verificationPrompt ?? "verify the thing",
    status: overrides.status ?? "planned",
    priority: overrides.priority ?? "normal",
    targetKind: overrides.targetKind ?? null,
    targetId: overrides.targetId ?? null,
    resultSummary: overrides.resultSummary ?? null,
    createdByAgentId: overrides.createdByAgentId ?? null,
    payloadJson: overrides.payloadJson ?? "{}",
    syncVersion: overrides.syncVersion ?? 1,
    syncDeleted: overrides.syncDeleted ?? false,
    createdAt: overrides.createdAt,
    updatedAt: overrides.updatedAt ?? overrides.createdAt,
  };
}
