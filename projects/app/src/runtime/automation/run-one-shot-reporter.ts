import { mkdir } from "node:fs/promises";
import { join, resolve } from "node:path";
import { homedir } from "node:os";

import { enqueueClaudeAgentWork } from "../../claude/agents/runs";
import { modelForEffort, type Effort } from "../../claude/agents/roles/models";
import { ensureRuntimeContext } from "../../config/session-context";
import { researchProjectRepository } from "../../data/repositories/research-projects";
import { hasAnthropicKey } from "../../secrets/local-secret-store";
import {
  claimDueWorkItem,
  handleClaimedWorkItem,
  workItemLeaseMs,
  CLAUDE_REPORTER_SESSION_WORK_ITEM_PURPOSE,
} from "../work-items";
import { getDb } from "../../data/db/client";
import { workItems } from "../../data/db/schema";
import { eq } from "drizzle-orm";

export type ReportRunSummary = {
  outputDir: string;
  workItemStatus: string;
};

export async function runOneShotReporter({
  sessionId,
  effort,
  outputDir,
}: {
  sessionId: string;
  effort: Effort;
  outputDir?: string;
}): Promise<ReportRunSummary> {
  if (!(await hasAnthropicKey())) {
    throw new Error("SITU_ANTHROPIC_KEY is required for situ report.");
  }

  await ensureRuntimeContext({ sessionId });

  const project = await researchProjectRepository.findActive();
  if (!project) {
    throw new Error(
      `No active research project found in session ${sessionId}. Reports require a research project to summarize.`,
    );
  }

  const resolvedOutputDir = resolve(
    outputDir ?? join(process.env.SITU_HOME ?? join(homedir(), ".situ"), "reports", sessionId),
  );
  await mkdir(resolvedOutputDir, { recursive: true });

  const modelOverride = modelForEffort({ effort });

  const initialContent = [
    `Generate a situ session report for research project ${project.id}.`,
    `Goal: ${project.goal}`,
    `Phase: ${project.phase}`,
    `Output directory: ${resolvedOutputDir}`,
    "",
    "Read enough of the project state to understand the chronological shape of the run, then use run_report_command to write _make_trajectory.py and REPORT.md (heredocs work well) and to render trajectory.png with python3.",
  ].join("\n");

  const { workItemId } = await enqueueClaudeAgentWork({
    purpose: CLAUDE_REPORTER_SESSION_WORK_ITEM_PURPOSE,
    content: initialContent,
    targetKind: "researchProject",
    targetId: project.id,
    payload: {
      researchProjectId: project.id,
      researchProjectPhase: project.phase,
      reportOutputDir: resolvedOutputDir,
      modelOverride,
    },
  });

  const claimed = await claimDueWorkItem({
    leaseMs: workItemLeaseMs,
    purpose: CLAUDE_REPORTER_SESSION_WORK_ITEM_PURPOSE,
  });
  if (!claimed || claimed.id !== workItemId) {
    throw new Error(
      `Failed to claim reporter work item ${workItemId} (claimed=${claimed?.id ?? "none"}). Another process may be holding the queue.`,
    );
  }
  await handleClaimedWorkItem({ workItem: claimed });

  const final = await getDb().query.workItems.findFirst({ where: eq(workItems.id, workItemId) });
  return {
    outputDir: resolvedOutputDir,
    workItemStatus: final?.status ?? "unknown",
  };
}
