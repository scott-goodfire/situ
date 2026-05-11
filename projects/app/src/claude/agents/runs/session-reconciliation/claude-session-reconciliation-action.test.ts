import { describe, expect, test } from "bun:test";

import {
  claudeSessionReconciliationAction,
  claudeSessionReplaceStalledAction,
  claudeSessionRetrieveErrorAction,
  ClaudeSessionReconciliationActionKind,
} from "./claude-session-reconciliation-action";

describe("Claude session reconciliation action", () => {
  test("maps active remote statuses to active agent reconciliation", () => {
    for (const status of ["running", "rescheduling"]) {
      expect(
        claudeSessionReconciliationAction({
          claudeSessionId: "claude-session-1",
          status,
        }),
      ).toEqual({ kind: ClaudeSessionReconciliationActionKind.MarkAgentsActive });
    }
  });

  test("maps idle and terminated remote statuses", () => {
    expect(
      claudeSessionReconciliationAction({
        claudeSessionId: "claude-session-1",
        status: "idle",
      }),
    ).toEqual({ kind: ClaudeSessionReconciliationActionKind.MarkAgentsIdle });

    expect(
      claudeSessionReconciliationAction({
        claudeSessionId: "claude-session-1",
        status: "terminated",
      }),
    ).toEqual({
      kind: ClaudeSessionReconciliationActionKind.ReplaceTerminatedSession,
      oldClaudeSessionId: "claude-session-1",
    });
  });

  test("leaves unknown remote statuses alone", () => {
    expect(
      claudeSessionReconciliationAction({
        claudeSessionId: "claude-session-1",
        status: "starting",
      }),
    ).toEqual({ kind: ClaudeSessionReconciliationActionKind.None });
  });

  test("builds a ReplaceStalledSession action that carries the exhausted count", () => {
    expect(
      claudeSessionReplaceStalledAction({
        claudeSessionId: "claude-session-1",
        exhaustedCount: 12,
      }),
    ).toEqual({
      kind: ClaudeSessionReconciliationActionKind.ReplaceStalledSession,
      oldClaudeSessionId: "claude-session-1",
      exhaustedCount: 12,
    });
  });

  test("maps retrieve failures by error shape", () => {
    const notFound = { statusCode: 404 };
    expect(
      claudeSessionRetrieveErrorAction({
        claudeSessionId: "claude-session-1",
        error: notFound,
      }),
    ).toEqual({
      error: notFound,
      kind: ClaudeSessionReconciliationActionKind.ReplaceUnreachableSession,
      oldClaudeSessionId: "claude-session-1",
    });

    const otherError = new Error("remote unavailable");
    expect(
      claudeSessionRetrieveErrorAction({
        claudeSessionId: "claude-session-1",
        error: otherError,
      }),
    ).toEqual({
      error: otherError,
      kind: ClaudeSessionReconciliationActionKind.RecordSupervisorError,
      oldClaudeSessionId: "claude-session-1",
    });
  });
});
