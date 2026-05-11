import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterAll, beforeAll, describe, expect, test } from "bun:test";

import { ensureRuntimeContext } from "../../config/session-context";
import { computeTargetRepository } from "@situ/compute";
import { artifactRepository } from "./artifacts";
import { baselineRepository } from "./baselines";
import { entityLinkRepository } from "./entity-links";
import { evaluationRepository } from "./evaluations";
import { experimentRepository } from "./experiments";
import { hypothesisRepository } from "./hypotheses";
import { measurementRepository } from "./measurements";
import { researchProjectInteractionRepository } from "./research-project-interactions";
import { researchProjectRepository } from "./research-projects";
import { researchTaskVerificationRepository } from "./research-task-verifications";
import type { ResearchTaskRecord } from "./research-tasks";
import { researchTaskRepository } from "./research-tasks";
import { feedEntryRepository } from "./feed-entries";
import { clampRepositoryLimit } from "./__shared__";

let tempRoot: string;

describe("repository contracts", () => {
  beforeAll(async () => {
    tempRoot = await mkdtemp(join(tmpdir(), "situ-repositories-"));
    process.env.SITU_HOME = join(tempRoot, "situ");
    process.env.SITU_REPO_PATH = tempRoot;
    process.env.SITU_DB_PATH = join(tempRoot, "situ", "sessions", "test", "session.sqlite");
    await ensureRuntimeContext({ sessionId: "test" });
  });

  afterAll(async () => {
    await rm(tempRoot, { recursive: true, force: true });
  });

  test("keeps shared repository limit handling defensive", () => {
    expect(clampRepositoryLimit({ limit: 3.9 })).toBe(3);
    expect(clampRepositoryLimit({ limit: Number.NaN })).toBe(10);
    expect(clampRepositoryLimit({ limit: 500 })).toBe(50);
    expect(clampRepositoryLimit({ limit: -1 })).toBe(1);
  });

  test("persists ResearchProject records, interactions, tasks, and verifications", async () => {
    const project = await researchProjectRepository.create({
      goal: "Understand the repo and prepare baseline confirmation.",
    });
    expect((await researchProjectRepository.get({ researchProjectId: project.id }))?.id).toBe(
      project.id,
    );
    expect(
      (await researchProjectRepository.search({ query: "baseline" })).map((item) => item.id),
    ).toContain(project.id);

    const interaction = await researchProjectInteractionRepository.create({
      researchProjectId: project.id,
      kind: "question",
      prompt: "Which metric should define the baseline?",
      details: "The manager needs a measurable target.",
    });
    expect(interaction.status).toBe("pending");
    expect(
      (await researchProjectRepository.require({ researchProjectId: project.id })).status,
    ).toBe("blocked_on_user");

    const answered = await researchProjectInteractionRepository.transition({
      interactionId: interaction.id,
      status: "answered",
      response: "Use the existing test suite pass rate.",
    });
    expect(answered.response).toBe("Use the existing test suite pass rate.");
    expect(
      (await researchProjectRepository.require({ researchProjectId: project.id })).status,
    ).toBe("active");

    const task = await researchTaskRepository.create({
      researchProjectId: project.id,
      type: "explore",
      title: "Repository ResearchTask",
      workerPrompt: "Inspect the repository state.",
      verificationPrompt: "Check that the result cites durable evidence.",
    });
    expect((await researchTaskRepository.get({ researchTaskId: task.id }))?.id).toBe(task.id);
    expect(
      (await researchTaskRepository.search({ query: "repository" })).map((item) => item.id),
    ).toContain(task.id);
    expect((await researchTaskRepository.claimPlanned({ researchTaskId: task.id })).status).toBe(
      "running",
    );
    expect(
      (
        await researchTaskRepository.transition({
          researchTaskId: task.id,
          status: "awaiting_verification",
          resultSummary: "Repository state inspected.",
        })
      ).status,
    ).toBe("awaiting_verification");

    const verification = await researchTaskVerificationRepository.create({
      researchTaskId: task.id,
      status: "passed",
      verifierPrompt: "Check that the result cites durable evidence.",
      judgment: "Evidence is sufficient.",
      evidenceSummary: "Linked repository output was inspected.",
    });
    expect(verification.status).toBe("passed");
    expect((await researchTaskRepository.require({ researchTaskId: task.id })).status).toBe(
      "verified",
    );

    const completed = await researchProjectRepository.transition({
      researchProjectId: project.id,
      status: "complete",
      resultSummary: "Baseline checkpoint accepted.",
    });
    expect(completed.status).toBe("complete");
    await expect(
      researchProjectRepository.transition({
        researchProjectId: project.id,
        status: "failed",
        resultSummary: "Too late.",
      }),
    ).rejects.toThrow("terminal status");
  });

  test("guards ResearchTaskVerification status semantics", async () => {
    const plannedTask = await createRepositoryResearchTask({
      title: "Verification cannot target planned task",
    });
    await expect(
      researchTaskVerificationRepository.create({
        researchTaskId: plannedTask.id,
        status: "failed",
        verifierPrompt: "Check evidence.",
        judgment: "Task is not ready for verification.",
        evidenceSummary: "Task status is planned.",
      }),
    ).rejects.toThrow("awaiting_verification");

    const blankPassTask = await createAwaitingVerificationTask({
      title: "Blank pass evidence task",
    });
    await expect(
      researchTaskVerificationRepository.create({
        researchTaskId: blankPassTask.id,
        status: "passed",
        verifierPrompt: "Check evidence.",
        judgment: "Looks good.",
        evidenceSummary: " ",
      }),
    ).rejects.toThrow("non-empty evidenceSummary");
    expect(
      (await researchTaskRepository.require({ researchTaskId: blankPassTask.id })).status,
    ).toBe("awaiting_verification");

    const failedTask = await createAwaitingVerificationTask({
      title: "Failed verification task",
    });
    await researchTaskVerificationRepository.create({
      researchTaskId: failedTask.id,
      status: "failed",
      verifierPrompt: "Check evidence.",
      judgment: "Evidence is missing.",
      evidenceSummary: "Required artifact was not created.",
    });
    expect((await researchTaskRepository.require({ researchTaskId: failedTask.id })).status).toBe(
      "rejected",
    );

    const suspiciousTask = await createAwaitingVerificationTask({
      title: "Suspicious verification task",
    });
    await researchTaskVerificationRepository.create({
      researchTaskId: suspiciousTask.id,
      status: "suspicious",
      verifierPrompt: "Check evidence.",
      judgment: "Measurement looks incomparable.",
      evidenceSummary: "Comparison uses a different metric.",
    });
    expect(
      (await researchTaskRepository.require({ researchTaskId: suspiciousTask.id })).status,
    ).toBe("rejected");

    const needsEvidenceTask = await createAwaitingVerificationTask({
      title: "Needs more evidence task",
    });
    await researchTaskVerificationRepository.create({
      researchTaskId: needsEvidenceTask.id,
      status: "needs_more_evidence",
      verifierPrompt: "Check evidence.",
      judgment: "More durable evidence is needed.",
      evidenceSummary: "The worker summary cites no artifact or measurement id.",
    });
    expect(
      (await researchTaskRepository.require({ researchTaskId: needsEvidenceTask.id })).status,
    ).toBe("planned");
  });

  test("persists hypotheses with get/list/search/activity contracts", async () => {
    const researchTask = await createRepositoryResearchTask({
      title: "Repository hypothesis ResearchTask",
    });
    const hypothesis = await hypothesisRepository.create({
      title: "Repository hypothesis beta",
      summary: "Hypothesis summary.",
      createdByResearchTaskId: researchTask.id,
    });
    expect((await hypothesisRepository.get({ hypothesisId: hypothesis.id }))?.id).toBe(
      hypothesis.id,
    );
    expect(
      (await hypothesisRepository.search({ query: "beta", status: "triage" })).map(
        (item) => item.id,
      ),
    ).toContain(hypothesis.id);
    expect(
      (
        await hypothesisRepository.submit({
          hypothesisId: hypothesis.id,
          comment: "Hypothesis ready.",
        })
      ).status,
    ).toBe("in_review");
    expect(
      (
        await hypothesisRepository.accept({
          hypothesisId: hypothesis.id,
          comment: "Hypothesis accepted.",
        })
      ).status,
    ).toBe("accepted");
  });

  test("persists science records, transitions, and measurements through repositories", async () => {
    const researchTask = await createRepositoryResearchTask({
      title: "Repository science ResearchTask",
    });
    const baseline = await baselineRepository.create({
      title: "Repository baseline",
      summary: "Baseline summary.",
      createdByResearchTaskId: researchTask.id,
    });
    const hypothesis = await hypothesisRepository.create({
      title: "Repository experiment hypothesis",
      summary: "Primary hypothesis for the repository experiment.",
      createdByResearchTaskId: researchTask.id,
    });
    const experiment = await experimentRepository.create({
      title: "Repository experiment",
      summary: "Experiment summary.",
      createdByResearchTaskId: researchTask.id,
      associatedHypothesisId: hypothesis.id,
      baseCommit: "base-commit",
      candidateCommit: "candidate-commit",
    });
    expect(experiment.associatedHypothesisId).toBe(hypothesis.id);

    expect(
      (
        await baselineRepository.submit({
          baselineId: baseline.id,
          comment: "Baseline ready.",
        })
      ).status,
    ).toBe("in_review");
    expect(
      (
        await experimentRepository.complete({
          experimentId: experiment.id,
          comment: "Experiment complete.",
        })
      ).status,
    ).toBe("done");
    expect(
      (await experimentRepository.search({ query: "candidate-commit" })).map((item) => item.id),
    ).toContain(experiment.id);

    const evaluation = await evaluationRepository.create({
      title: "Repository evaluation",
      summary: "Evaluation summary.",
      createdByResearchTaskId: researchTask.id,
      associatedBaselineId: baseline.id,
      associatedExperimentId: experiment.id,
    });
    expect((await evaluationRepository.get({ evaluationId: evaluation.id }))?.id).toBe(
      evaluation.id,
    );
    expect(
      (
        await evaluationRepository.submit({
          evaluationId: evaluation.id,
          comment: "Evaluation ready.",
        })
      ).status,
    ).toBe("in_review");

    const measurement = await measurementRepository.record({
      body: "Measurement body.",
      createdByResearchTaskId: researchTask.id,
      evaluationId: evaluation.id,
      payload: {
        metrics: {
          passed: true,
          latencyMs: { value: 42, unit: "ms", direction: "lower_is_better" },
        },
      },
    });
    const payload = JSON.parse(measurement.payloadJson) as {
      metrics?: Record<string, { value: unknown; unit?: string }>;
    };
    expect(payload.metrics?.passed?.value).toBe(true);
    expect(payload.metrics?.latencyMs?.unit).toBe("ms");
    expect(
      (
        await measurementRepository.search({
          evaluationId: evaluation.id,
          researchTaskId: researchTask.id,
        })
      ).map((item) => item.id),
    ).toContain(measurement.id);

    const comparison = await evaluationRepository.recordExperimentComparison({
      baselineId: baseline.id,
      experimentId: experiment.id,
      title: "Repository comparison",
      summary: "Compare baseline and candidate.",
      body: "Candidate differs from baseline.",
      createdByResearchTaskId: researchTask.id,
      command: "bun test",
      baselineOutput: "old",
      candidateOutput: "new",
    });
    expect(comparison.evaluation.associatedBaselineId).toBe(baseline.id);
    expect(comparison.measurement.evaluationId).toBe(comparison.evaluation.id);
    expect(
      (
        await evaluationRepository.getWithActivities({
          evaluationId: comparison.evaluation.id,
        })
      ).measurements.map((item) => item.id),
    ).toContain(comparison.measurement.id);
  });

  test("persists artifacts, entity links, and compute targets with consistent get semantics", async () => {
    const researchTask = await createRepositoryResearchTask({
      title: "Repository evidence ResearchTask",
    });
    const hypothesis = await hypothesisRepository.create({
      title: "Linked hypothesis",
      summary: "Hypothesis linked to experiment.",
      createdByResearchTaskId: researchTask.id,
    });
    const experiment = await experimentRepository.create({
      title: "Linked experiment",
      summary: "Experiment linked to hypothesis.",
      createdByResearchTaskId: researchTask.id,
      associatedHypothesisId: hypothesis.id,
    });

    await expect(
      artifactRepository.require({ artifactId: "missing-artifact" }),
    ).rejects.toMatchObject({ code: "artifact_not_found" });
    expect(await artifactRepository.get({ artifactId: "missing-artifact" })).toBe(undefined);
    const artifact = await artifactRepository.create({
      title: "Repository artifact",
      path: "/tmp/repository-artifact.txt",
      kind: "log",
      body: "Repository artifact body.",
      entityKind: "research_task",
      entityId: researchTask.id,
      createdByResearchTaskId: researchTask.id,
      mediaType: "text/plain",
      sizeBytes: 12,
    });
    expect(artifact.body).toBe("Repository artifact body.");
    expect((await artifactRepository.get({ artifactId: artifact.id }))?.id).toBe(artifact.id);
    expect(
      (await artifactRepository.search({ query: "body", entityKind: "research_task" })).map(
        (item) => item.id,
      ),
    ).toContain(artifact.id);

    const inlineArtifact = await artifactRepository.create({
      title: "Inline repository report",
      kind: "report",
      body: "Inline artifact body-only report.",
      entityKind: "research_task",
      entityId: researchTask.id,
      createdByResearchTaskId: researchTask.id,
      mediaType: "text/markdown",
    });
    expect(inlineArtifact.body).toBe("Inline artifact body-only report.");
    expect(inlineArtifact.path.startsWith("inline/")).toBe(true);
    expect(inlineArtifact.path.endsWith(".md")).toBe(true);

    await expect(
      entityLinkRepository.require({ entityLinkId: "missing-link" }),
    ).rejects.toMatchObject({ code: "entity_link_not_found" });
    expect(await entityLinkRepository.get({ entityLinkId: "missing-link" })).toBe(undefined);
    const entityLink = await entityLinkRepository.create({
      fromKind: "research_task",
      fromId: researchTask.id,
      toKind: "artifact",
      toId: artifact.id,
      relationship: "produced",
    });
    expect((await entityLinkRepository.get({ entityLinkId: entityLink.id }))?.id).toBe(
      entityLink.id,
    );
    expect(
      (await entityLinkRepository.search({ relationship: "produced" })).map((item) => item.id),
    ).toContain(entityLink.id);

    expect(experiment.associatedHypothesisId).toBe(hypothesis.id);

    const target = await computeTargetRepository.upsert({
      computeTargetId: "repository-target-a",
      pool: "repository-pool-a",
      label: "Repository target",
      metadata: { cores: 4 },
    });
    expect((await computeTargetRepository.get({ computeTargetId: target.id }))?.id).toBe(target.id);
    expect(await computeTargetRepository.poolExists({ pool: target.pool })).toBe(true);
    expect(
      (await computeTargetRepository.list({ pool: target.pool })).map((item) => item.id),
    ).toContain(target.id);

    const claimed = await computeTargetRepository.claim({
      computeTargetId: target.id,
      researchTaskId: researchTask.id,
      leaseSeconds: 30,
    });
    expect(claimed.status).toBe("claimed");
    expect(
      await computeTargetRepository.heartbeat({
        computeTargetId: target.id,
        owningResearchTaskId: "wrong-task",
      }),
    ).toBe(undefined);
    expect(
      (
        await computeTargetRepository.release({
          computeTargetId: target.id,
          owningResearchTaskId: "wrong-task",
        })
      ).status,
    ).toBe("claimed");
    expect(
      (
        await computeTargetRepository.release({
          computeTargetId: target.id,
          owningResearchTaskId: researchTask.id,
        })
      ).status,
    ).toBe("idle");
    expect((await computeTargetRepository.drain({ computeTargetId: target.id })).status).toBe(
      "draining",
    );
    expect((await computeTargetRepository.restore({ computeTargetId: target.id })).status).toBe(
      "idle",
    );
    expect((await computeTargetRepository.markDead({ computeTargetId: target.id })).status).toBe(
      "dead",
    );
    expect(await computeTargetRepository.poolExists({ pool: target.pool })).toBe(false);

    const pooled = await computeTargetRepository.upsert({
      computeTargetId: "repository-target-b",
      pool: "repository-pool-b",
    });
    expect(
      (
        await computeTargetRepository.claimForPool({
          pool: pooled.pool,
          researchTaskId: researchTask.id,
        })
      )?.id,
    ).toBe(pooled.id);
  });

  test("persists feed entries with list/latest semantics keyed by research project", async () => {
    const project = await researchProjectRepository.create({
      goal: "Exercise the feed entry repository contract.",
    });

    const first = await feedEntryRepository.create({
      researchProjectId: project.id,
      summaryMarkdown: "First narration.",
      severity: "info",
      citedAppEventIds: ["evt_1"],
      windowStartedAt: "2026-05-11T00:00:00.000Z",
      windowEndedAt: "2026-05-11T00:05:00.000Z",
    });
    expect(first.severity).toBe("info");
    expect((await feedEntryRepository.get({ feedEntryId: first.id }))?.id).toBe(first.id);
    expect((await feedEntryRepository.require({ feedEntryId: first.id })).id).toBe(first.id);

    await new Promise((resolveTimeout) => setTimeout(resolveTimeout, 5));
    const second = await feedEntryRepository.create({
      researchProjectId: project.id,
      summaryMarkdown: "Second narration.",
      severity: "stuck",
      windowStartedAt: "2026-05-11T00:05:00.000Z",
      windowEndedAt: "2026-05-11T00:10:00.000Z",
    });

    const list = await feedEntryRepository.list({ researchProjectId: project.id });
    expect(list.map((entry) => entry.id)).toEqual([second.id, first.id]);

    expect((await feedEntryRepository.latest({ researchProjectId: project.id }))?.id).toBe(
      second.id,
    );

    await expect(feedEntryRepository.require({ feedEntryId: "feed_missing" })).rejects.toThrow(
      "feed_entry_not_found",
    );

    await expect(
      feedEntryRepository.create({
        researchProjectId: "rp_does_not_exist",
        summaryMarkdown: "Should not insert.",
        severity: "info",
        windowStartedAt: "2026-05-11T00:00:00.000Z",
        windowEndedAt: "2026-05-11T00:05:00.000Z",
      }),
    ).rejects.toThrow();
  });
});

async function createRepositoryResearchTask({
  title,
}: {
  title: string;
}): Promise<ResearchTaskRecord> {
  const project = await researchProjectRepository.create({
    goal: `Repository contract project ${crypto.randomUUID()}`,
  });
  return researchTaskRepository.create({
    researchProjectId: project.id,
    type: "exploit",
    title,
    workerPrompt: "Exercise repository contracts.",
    verificationPrompt: "Verify repository contract behavior.",
  });
}

async function createAwaitingVerificationTask({
  title,
}: {
  title: string;
}): Promise<ResearchTaskRecord> {
  const task = await createRepositoryResearchTask({ title });
  await researchTaskRepository.claimPlanned({ researchTaskId: task.id });
  return researchTaskRepository.transition({
    researchTaskId: task.id,
    status: "awaiting_verification",
    resultSummary: "Ready for verification.",
  });
}
