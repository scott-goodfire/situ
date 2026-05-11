import { mkdir, mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterAll, beforeAll, beforeEach, describe, expect, test } from "bun:test";

import { ensureRuntimeContext, resetRuntimeContextForTests } from "../../../config/session-context";
import { getDb, resetDbForTests } from "../../../data/db/client";
import {
  baselineActivities,
  baselines,
  evaluationActivities,
  evaluations,
  experimentActivities,
  experiments,
  hypothesisActivities,
  hypotheses,
  measurements,
  researchProjects,
} from "../../../data/db/schema";
import { baselineRepository } from "../../../data/repositories/baselines";
import { experimentRepository } from "../../../data/repositories/experiments";
import { hypothesisRepository } from "../../../data/repositories/hypotheses";
import { researchProjectRepository } from "../../../data/repositories/research-projects";
import type { ClaudeAgentToolContext } from "./types";
import { recordExperimentComparisonTool } from "./record-experiment-comparison";

const originalEnv = {
  SITU_HOME: process.env.SITU_HOME,
  SITU_REPO_PATH: process.env.SITU_REPO_PATH,
  SITU_DB_PATH: process.env.SITU_DB_PATH,
};

let tempRoot: string;

describe("record_experiment_comparison tool", () => {
  beforeAll(async () => {
    resetDbForTests();
    resetRuntimeContextForTests();
    tempRoot = await mkdtemp(join(tmpdir(), "situ-record-experiment-comparison-tool-"));
    const repoPath = join(tempRoot, "repo");
    const sessionHome = join(tempRoot, "situ", "sessions", "ses_record_experiment_comparison_tool");
    await mkdir(repoPath, { recursive: true });
    await mkdir(sessionHome, { recursive: true });
    process.env.SITU_HOME = join(tempRoot, "situ");
    process.env.SITU_REPO_PATH = repoPath;
    process.env.SITU_DB_PATH = join(sessionHome, "session.sqlite");
    await ensureRuntimeContext({ sessionId: "ses_record_experiment_comparison_tool" });
  });

  beforeEach(() => {
    resetTables();
  });

  afterAll(async () => {
    resetDbForTests();
    resetRuntimeContextForTests();
    restoreEnv();
    await rm(tempRoot, { recursive: true, force: true });
  });

  test("returns Result.ok with comparison data when the experiment has a candidate commit", async () => {
    const { baseline, experiment } = await seedComparison({ withCandidateCommit: true });

    const result = await recordExperimentComparisonTool.handler({
      input: {
        baselineId: baseline.id,
        experimentId: experiment.id,
        title: "Candidate beats baseline on the native test suite",
        summary: "Candidate passes 18/20 vs baseline 12/20.",
        body: "verdict: candidate is better; numbers in the payload.",
      },
      context: toolContext(),
    });

    const envelope = JSON.parse(result.content) as Record<string, unknown>;
    expect(envelope.ok).toBe(true);
    const data = jsonRecord(envelope.data);
    const comparison = jsonRecord(data.comparison);
    const evaluation = jsonRecord(comparison.evaluation);
    expect(evaluation.associatedBaselineId).toBe(baseline.id);
    expect(evaluation.associatedExperimentId).toBe(experiment.id);
  });

  test("returns no_candidate_commit failure envelope when the experiment has no captured candidate", async () => {
    const { baseline, experiment } = await seedComparison({ withCandidateCommit: false });

    const result = await recordExperimentComparisonTool.handler({
      input: {
        baselineId: baseline.id,
        experimentId: experiment.id,
        title: "Compare too early",
        summary: "No candidate captured yet.",
        body: "verdict: blocked.",
      },
      context: toolContext(),
    });

    const envelope = JSON.parse(result.content) as Record<string, unknown>;
    expect(envelope.ok).toBe(false);
    expect(envelope.code).toBe("no_candidate_commit");
    expect(typeof envelope.hint).toBe("string");
    expect(envelope.hint).toContain("capture_experiment_candidate");
    const details = jsonRecord(envelope.details);
    expect(details.experimentId).toBe(experiment.id);
  });

  test("returns invalid_input failure envelope when required fields are missing", async () => {
    const result = await recordExperimentComparisonTool.handler({
      input: {},
      context: toolContext(),
    });

    const envelope = JSON.parse(result.content) as Record<string, unknown>;
    expect(envelope.ok).toBe(false);
    expect(envelope.code).toBe("invalid_input");
    expect(typeof envelope.hint).toBe("string");
    expect(String(envelope.hint).length).toBeGreaterThan(0);
  });
});

async function seedComparison({ withCandidateCommit }: { withCandidateCommit: boolean }): Promise<{
  baseline: Awaited<ReturnType<typeof baselineRepository.create>>;
  experiment: Awaited<ReturnType<typeof experimentRepository.create>>;
}> {
  const project = await researchProjectRepository.create({
    goal: "Compare candidate against baseline.",
  });
  await researchProjectRepository.updatePhase({
    researchProjectId: project.id,
    phase: "search",
  });
  const baseline = await baselineRepository.create({
    researchProjectId: project.id,
    title: "Native test suite baseline",
    summary: "Native test suite pass rate.",
  });
  const hypothesis = await hypothesisRepository.create({
    title: "Candidate raises pass rate",
    summary: "Suspect the new helper raises the native test suite pass rate.",
  });
  const experiment = await experimentRepository.create({
    title: "Try the helper change",
    summary: "Apply the helper change and rerun the native test suite.",
    associatedHypothesisId: hypothesis.id,
    baseCommit: "0000000000000000000000000000000000000000",
    candidateCommit: withCandidateCommit ? "1111111111111111111111111111111111111111" : undefined,
  });
  return { baseline, experiment };
}

function toolContext(): ClaudeAgentToolContext {
  const now = "2026-01-01T00:00:00.000Z";
  return {
    claudeAgentRunId: "run_record_experiment_comparison_tool",
    workItem: {
      id: "work_record_experiment_comparison_tool",
      purpose: "claude.scientist_research_task",
      targetKind: "researchTask",
      targetId: "task_record_experiment_comparison_tool",
      status: "pending",
      ownerAgentId: null,
      ownerWorkflowId: null,
      attempt: 1,
      availableAt: now,
      claimedAt: null,
      leaseExpiresAt: null,
      completedAt: null,
      payloadJson: "{}",
      syncVersion: 1,
      syncDeleted: false,
      createdAt: now,
      updatedAt: now,
    },
  };
}

function resetTables(): void {
  const db = getDb();
  db.delete(measurements).run();
  db.delete(evaluationActivities).run();
  db.delete(evaluations).run();
  db.delete(experimentActivities).run();
  db.delete(experiments).run();
  db.delete(hypothesisActivities).run();
  db.delete(hypotheses).run();
  db.delete(baselineActivities).run();
  db.delete(baselines).run();
  db.delete(researchProjects).run();
}

function jsonRecord(value: unknown): Record<string, unknown> {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    throw new Error("Expected JSON object.");
  }
  return value as Record<string, unknown>;
}

function restoreEnv(): void {
  for (const [key, value] of Object.entries(originalEnv)) {
    if (value === undefined) {
      delete process.env[key];
    } else {
      process.env[key] = value;
    }
  }
}
