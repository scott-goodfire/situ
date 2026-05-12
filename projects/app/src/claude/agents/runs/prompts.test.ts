import { describe, expect, test } from "bun:test";

import type { ResearchTaskRecord } from "../../../data/repositories/research-tasks";
import { SEARCH_BALANCE_SIGNAL_WINDOW, searchBalanceSignalLines } from "./prompts";

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
      "- Tasks since the last explore: 4 (cadence gate at 5; non-explore tasks are rejected once it reaches 5).",
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
