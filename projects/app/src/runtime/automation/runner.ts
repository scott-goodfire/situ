import { and, asc, eq, inArray } from "drizzle-orm";
import { DateTime } from "luxon";

import { getDb } from "../../data/db/client";
import {
  claudeAgentRuns,
  hypotheses,
  researchProjects,
  researchProjectInteractions,
  researchTasks,
  workItems,
} from "../../data/db/schema";
import { baselineRepository } from "../../data/repositories/baselines";
import { researchProjectInteractionRepository } from "../../data/repositories/research-project-interactions";
import { researchProjectRepository } from "../../data/repositories/research-projects";
import { jsonModule } from "../../modules/json";
import { hasAnthropicKey } from "../../secrets/local-secret-store";
import type { ComputeBlocker } from "@situ/compute";
import { readComputeBlockers } from "../compute-blockers";
import { enqueueManagerResearchProjectWork } from "../dispatch";

export type AutomationState = {
  activeResearchTasks: number;
  pendingWorkItems: number;
  claimedWorkItems: number;
  runningClaudeAgentRuns: number;
  triageHypotheses: number;
  pendingUserQuestions: number;
  pendingBaselineConfirmations: number;
  failedResearchTasks: number;
  failedWorkItems: number;
  failedClaudeAgentRuns: number;
  computeBlockers: ComputeBlocker[];
};

export type AutomationBlocker = {
  interactionId: string;
  researchProjectId: string;
  kind: "question" | "baseline_confirmation";
  prompt: string;
  createdAt: string;
};

export type AutomationRunStatus = "idle" | "timeout" | "blocked_on_user" | "blocked_on_compute";

export type AutomationRunSummary = {
  status: AutomationRunStatus;
  state: AutomationState;
  blockers?: AutomationBlocker[];
  computeBlockers?: ComputeBlocker[];
};

export type AutomationProgress = {
  state: AutomationState;
};

export async function waitForAutomationUntilIdle({
  timeoutSeconds,
  pollMs = 1_000,
  settleMs = 2_000,
  onProgress,
  autoConfirmBaselines = false,
  ignoreTriageHypotheses = false,
}: {
  timeoutSeconds: number;
  pollMs?: number;
  settleMs?: number;
  onProgress?: (progress: AutomationProgress) => void;
  autoConfirmBaselines?: boolean;
  ignoreTriageHypotheses?: boolean;
}): Promise<AutomationRunSummary> {
  if (!(await hasAnthropicKey())) {
    throw new Error("SITU_ANTHROPIC_KEY is required for headless exec.");
  }

  const deadline = DateTime.utc().plus({ seconds: timeoutSeconds });
  let lastBusyAt = Date.now();
  let state = await readAutomationState();
  let lastProgressSignature = "";
  while (DateTime.utc() < deadline) {
    if (autoConfirmBaselines) {
      const confirmed = await autoConfirmPendingBaselines();
      if (confirmed > 0) {
        lastBusyAt = Date.now();
      }
    }
    state = await readAutomationState();
    const progressSignature = JSON.stringify(state);
    if (progressSignature !== lastProgressSignature) {
      lastProgressSignature = progressSignature;
      onProgress?.({ state });
    }
    const missingComputeBlockers = state.computeBlockers.filter(
      (blocker) => blocker.kind === "missing_pool",
    );
    if (missingComputeBlockers.length > 0) {
      return {
        status: "blocked_on_compute",
        state,
        computeBlockers: missingComputeBlockers,
      };
    }
    if (isAutomationBlocked({ state, ignoreTriageHypotheses })) {
      return {
        status: "blocked_on_user",
        state,
        blockers: await readAutomationBlockers(),
      };
    }
    if (isAutomationIdle({ state, ignoreTriageHypotheses })) {
      if (Date.now() - lastBusyAt >= settleMs) {
        return { status: "idle", state };
      }
    } else {
      lastBusyAt = Date.now();
    }
    await sleep({ ms: pollMs });
  }
  return { status: "timeout", state: await readAutomationState() };
}

async function autoConfirmPendingBaselines(): Promise<number> {
  const pending = await getDb()
    .select()
    .from(researchProjectInteractions)
    .where(
      and(
        eq(researchProjectInteractions.kind, "baseline_confirmation"),
        eq(researchProjectInteractions.status, "pending"),
      ),
    );
  for (const interaction of pending) {
    await researchProjectInteractionRepository.transition({
      interactionId: interaction.id,
      status: "confirmed",
      response: "auto-confirmed by situ exec (headless run)",
    });
    const project = await researchProjectRepository.require({
      researchProjectId: interaction.researchProjectId,
    });
    if (project.phase === "baseline") {
      const baseline = await baselineForConfirmation({ interaction });
      if (baseline.status !== "accepted") {
        await baselineRepository.accept({
          baselineId: baseline.id,
          actor: "exec",
          comment: "Project baseline auto-confirmed by situ exec.",
        });
      }
      await researchProjectRepository.updatePhase({
        researchProjectId: interaction.researchProjectId,
        phase: "search",
        baselineSummary: baseline.summary,
      });
    }
    await enqueueManagerResearchProjectWork({
      researchProjectId: interaction.researchProjectId,
    });
  }
  return pending.length;
}

async function baselineForConfirmation({
  interaction,
}: {
  interaction: typeof researchProjectInteractions.$inferSelect;
}): Promise<Awaited<ReturnType<typeof baselineRepository.require>>> {
  const payload = jsonModule.parseRecord({ raw: interaction.payloadJson });
  const baselineId = payload.baselineId;
  if (typeof baselineId !== "string" || !baselineId.trim()) {
    throw new Error(`Baseline confirmation is missing baselineId: ${interaction.id}`);
  }
  const baseline = await baselineRepository.require({ baselineId });
  if (baseline.researchProjectId !== interaction.researchProjectId) {
    throw new Error(
      `Baseline ${baseline.id} does not belong to ResearchProject ${interaction.researchProjectId}.`,
    );
  }
  if (baseline.createdByResearchTaskId) {
    throw new Error(
      `Baseline confirmation requires a Manager-created project baseline: ${baseline.id}`,
    );
  }
  return baseline;
}

export async function readAutomationState(): Promise<AutomationState> {
  const db = getDb();
  const [
    activeResearchTasks,
    pendingWorkItems,
    claimedWorkItems,
    runningClaudeAgentRuns,
    triageHypotheses,
    blockers,
    failedResearchTasks,
    failedWorkItems,
    failedClaudeAgentRuns,
    computeBlockers,
  ] = await Promise.all([
    db.query.researchTasks.findMany({
      where: inArray(researchTasks.status, ["planned", "running", "awaiting_verification"]),
    }),
    db.query.workItems.findMany({
      where: eq(workItems.status, "pending"),
    }),
    db.query.workItems.findMany({
      where: eq(workItems.status, "claimed"),
    }),
    db.query.claudeAgentRuns.findMany({
      where: inArray(claudeAgentRuns.status, ["queued", "running", "waiting_for_action"]),
    }),
    db.query.hypotheses.findMany({
      where: eq(hypotheses.status, "triage"),
    }),
    readAutomationBlockers(),
    db.query.researchTasks.findMany({
      where: eq(researchTasks.status, "failed"),
    }),
    db.query.workItems.findMany({
      where: eq(workItems.status, "failed"),
    }),
    db.query.claudeAgentRuns.findMany({
      where: and(eq(claudeAgentRuns.status, "failed")),
    }),
    readComputeBlockers(),
  ]);
  return {
    activeResearchTasks: activeResearchTasks.length,
    pendingWorkItems: pendingWorkItems.length,
    claimedWorkItems: claimedWorkItems.length,
    runningClaudeAgentRuns: runningClaudeAgentRuns.length,
    triageHypotheses: triageHypotheses.length,
    pendingUserQuestions: blockers.filter((blocker) => blocker.kind === "question").length,
    pendingBaselineConfirmations: blockers.filter(
      (blocker) => blocker.kind === "baseline_confirmation",
    ).length,
    failedResearchTasks: failedResearchTasks.length,
    failedWorkItems: failedWorkItems.length,
    failedClaudeAgentRuns: failedClaudeAgentRuns.length,
    computeBlockers,
  };
}

async function readAutomationBlockers(): Promise<AutomationBlocker[]> {
  return getDb()
    .select({
      interactionId: researchProjectInteractions.id,
      researchProjectId: researchProjectInteractions.researchProjectId,
      kind: researchProjectInteractions.kind,
      prompt: researchProjectInteractions.prompt,
      createdAt: researchProjectInteractions.createdAt,
    })
    .from(researchProjectInteractions)
    .innerJoin(
      researchProjects,
      eq(researchProjects.id, researchProjectInteractions.researchProjectId),
    )
    .where(
      and(
        eq(researchProjectInteractions.status, "pending"),
        inArray(researchProjects.status, ["active", "blocked_on_user"]),
      ),
    )
    .orderBy(asc(researchProjectInteractions.createdAt), asc(researchProjectInteractions.id));
}

function hasRunnableAutomationWork({
  state,
  ignoreTriageHypotheses,
}: {
  state: AutomationState;
  ignoreTriageHypotheses: boolean;
}): boolean {
  return (
    state.activeResearchTasks > 0 ||
    state.pendingWorkItems > 0 ||
    state.claimedWorkItems > 0 ||
    state.runningClaudeAgentRuns > 0 ||
    (!ignoreTriageHypotheses && state.triageHypotheses > 0)
  );
}

function isAutomationBlocked({
  state,
  ignoreTriageHypotheses,
}: {
  state: AutomationState;
  ignoreTriageHypotheses: boolean;
}): boolean {
  return (
    !hasRunnableAutomationWork({ state, ignoreTriageHypotheses }) &&
    (state.pendingUserQuestions > 0 || state.pendingBaselineConfirmations > 0)
  );
}

function isAutomationIdle({
  state,
  ignoreTriageHypotheses,
}: {
  state: AutomationState;
  ignoreTriageHypotheses: boolean;
}): boolean {
  return (
    !hasRunnableAutomationWork({ state, ignoreTriageHypotheses }) &&
    state.pendingUserQuestions === 0 &&
    state.pendingBaselineConfirmations === 0
  );
}

async function sleep({ ms }: { ms: number }): Promise<void> {
  await new Promise((resolve) => {
    setTimeout(resolve, ms);
  });
}
