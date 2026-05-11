import { researchTaskRepository } from "../../../data/repositories/research-tasks";
import {
  enqueueManagerResearchProjectWork,
  enqueueScientistResearchTaskWork,
  enqueueVerifierResearchTaskWork,
} from "../../dispatch";
import { claimDueWorkItem, handleClaimedWorkItem, workItemLeaseMs } from "../../work-items";
import { readAutomationState, runAutomationUntilIdle } from "../runner";
import { createConfiguredResearchTask } from "./seed-research-tasks";
import type { LiveAgentSliceEvalConfig, LiveAgentSliceSummary } from "./types";

export async function runLiveAgentSliceDriver({
  config,
  researchProjectId,
}: {
  config: LiveAgentSliceEvalConfig;
  researchProjectId: string;
}): Promise<LiveAgentSliceSummary> {
  switch (config.driver) {
    case "manager_turn":
      return runManagerTurn({ researchProjectId });
    case "verifier_turn":
      return runVerifierTurn({ config, researchProjectId });
    case "scientist_verifier":
      return runScientistVerifierLoop({ config, researchProjectId });
  }
}

async function runManagerTurn({
  researchProjectId,
}: {
  researchProjectId: string;
}): Promise<LiveAgentSliceSummary> {
  const queued = await enqueueManagerResearchProjectWork({ researchProjectId });
  if (!queued) {
    throw new Error(`Manager ResearchProject work was not enqueued: ${researchProjectId}`);
  }
  await handleNextWorkItem({ expectedWorkItemId: queued.workItemId });
  return {
    driver: "manager_turn",
    allowActiveResearchTasks: true,
    state: await readAutomationState(),
  };
}

async function runVerifierTurn({
  config,
  researchProjectId,
}: {
  config: LiveAgentSliceEvalConfig;
  researchProjectId: string;
}): Promise<LiveAgentSliceSummary> {
  const task = await createConfiguredResearchTask({ config, researchProjectId });
  await researchTaskRepository.transition({
    researchTaskId: task.id,
    status: "awaiting_verification",
    resultSummary:
      config.workerSummary ??
      "Live verifier eval seeded a completed worker result that needs verifier judgment.",
  });
  const queued = await enqueueVerifierResearchTaskWork({ researchTaskId: task.id });
  if (!queued) {
    throw new Error(`Verifier ResearchTask work was not enqueued: ${task.id}`);
  }
  await handleNextWorkItem({ expectedWorkItemId: queued.workItemId });
  return {
    driver: "verifier_turn",
    allowActiveResearchTasks: false,
    state: await readAutomationState(),
  };
}

async function runScientistVerifierLoop({
  config,
  researchProjectId,
}: {
  config: LiveAgentSliceEvalConfig;
  researchProjectId: string;
}): Promise<LiveAgentSliceSummary> {
  const task = await createConfiguredResearchTask({ config, researchProjectId });
  const queued = await enqueueScientistResearchTaskWork({ researchTaskId: task.id });
  if (queued.status !== "enqueued") {
    throw new Error(`Scientist ResearchTask work was not enqueued: ${task.id} (${queued.reason})`);
  }
  const automation = await runAutomationUntilIdle({
    timeoutSeconds: config.timeoutSeconds,
    ignoreTriageHypotheses: true,
    onProgress: ({ state }) => {
      console.error(`LIVE_AGENT_EVAL_PROGRESS ${JSON.stringify(state)}`);
    },
  });
  if (automation.status !== "idle") {
    throw new Error(`Live eval did not become idle before timeout: ${automation.status}`);
  }
  return {
    driver: "scientist_verifier",
    allowActiveResearchTasks: false,
    state: automation.state,
  };
}

async function handleNextWorkItem({
  expectedWorkItemId,
}: {
  expectedWorkItemId: string;
}): Promise<void> {
  const workItem = await claimDueWorkItem({ leaseMs: workItemLeaseMs });
  if (!workItem) {
    throw new Error(`No pending work item was available to claim: ${expectedWorkItemId}`);
  }
  if (workItem.id !== expectedWorkItemId) {
    throw new Error(`Claimed unexpected work item ${workItem.id}; expected ${expectedWorkItemId}`);
  }
  await handleClaimedWorkItem({ workItem });
}
