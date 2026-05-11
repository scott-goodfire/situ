import type { AutomationState } from "../runner";
import type { LiveAgentSliceSummary } from "./types";

export function printLiveAgentSliceEvalReport({
  sessionId,
  researchProject,
  summary,
}: {
  sessionId: string;
  researchProject: unknown;
  summary: LiveAgentSliceSummary;
}): void {
  console.log(
    `${JSON.stringify(
      {
        sessionId,
        researchProject,
        summary,
      },
      null,
      2,
    )}\n`,
  );
}

export function hasFailedRuntimeState({
  state,
  allowActiveResearchTasks,
}: {
  state: AutomationState;
  allowActiveResearchTasks: boolean;
}): boolean {
  return (
    (!allowActiveResearchTasks && state.activeResearchTasks > 0) ||
    state.pendingWorkItems > 0 ||
    state.claimedWorkItems > 0 ||
    state.runningClaudeAgentRuns > 0 ||
    state.failedResearchTasks > 0 ||
    state.failedWorkItems > 0 ||
    state.failedClaudeAgentRuns > 0
  );
}
