import { mkdir, mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterAll, beforeAll, beforeEach, describe, expect, test } from "bun:test";
import { eq } from "drizzle-orm";

import { ensureRuntimeContext } from "../../config/session-context";
import { getDb } from "../../data/db/client";
import {
  appEvents,
  baselineActivities,
  baselines,
  claudeAgentRuns,
  computeTargets,
  researchProjectInteractions,
  researchProjects,
  researchTaskVerifications,
  researchTasks,
  workItems,
} from "../../data/db/schema";
import { baselineRepository } from "@situ/research-records";
import { createOrUpdateProjectBaseline } from "../project-baselines";
import { computeModule, computeTargetRepository } from "@situ/compute";
import { researchProjectInteractionRepository } from "@situ/research-projects";
import { researchProjectRepository } from "@situ/research-projects";
import { researchTaskVerificationRepository } from "@situ/research-projects";
import { researchTaskRepository } from "@situ/research-projects";
import { createApp } from "../../server";
import {
  CLAUDE_MANAGER_RESEARCH_PROJECT_WORK_ITEM_PURPOSE,
  CLAUDE_SCIENTIST_RESEARCH_TASK_WORK_ITEM_PURPOSE,
  CLAUDE_VERIFIER_RESEARCH_TASK_WORK_ITEM_PURPOSE,
} from "../work-items";
import {
  dispatchActiveResearchProject,
  dispatchAwaitingResearchTaskVerification,
  enqueueManagerResearchProjectWork,
  enqueueScientistResearchTaskWork,
  enqueueVerifierResearchTaskWork,
  dispatchPlannedResearchTask,
} from ".";

const originalEnv = {
  SITU_HOME: process.env.SITU_HOME,
  SITU_REPO_PATH: process.env.SITU_REPO_PATH,
  SITU_DB_PATH: process.env.SITU_DB_PATH,
  SITU_ANTHROPIC_KEY: process.env.SITU_ANTHROPIC_KEY,
};

let tempRoot: string;

describe("researchProject runtime flow", () => {
  beforeAll(async () => {
    tempRoot = await mkdtemp(join(tmpdir(), "situ-research-projects-"));
    const repoPath = join(tempRoot, "repo");
    const sessionHome = join(tempRoot, "situ", "sessions", "ses_research_projects");
    await mkdir(repoPath, { recursive: true });
    await mkdir(sessionHome, { recursive: true });
    process.env.SITU_HOME = join(tempRoot, "situ");
    process.env.SITU_REPO_PATH = repoPath;
    process.env.SITU_DB_PATH = join(sessionHome, "session.sqlite");
    process.env.SITU_ANTHROPIC_KEY = "test-key";
    await ensureRuntimeContext({ sessionId: "ses_research_projects" });
  });

  beforeEach(async () => {
    resetTables();
    await computeModule.ensureDefaultLocalTargets({ desiredCount: 12 });
  });

  afterAll(async () => {
    restoreEnv();
    await rm(tempRoot, { recursive: true, force: true });
  });

  test("POST /api/research-projects creates one project and enqueues Manager work", async () => {
    const app = createApp({ mode: { kind: "prod", webRoot: tempRoot } });
    const goal = "Explore the repo and prepare a baseline checkpoint.";

    const response = await app.request("/api/research-projects", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ goal }),
    });

    expect(response.status).toBe(200);
    const payload = jsonRecord(await response.json());
    const project = jsonRecord(payload.researchProject);
    expect(project.goal).toBe(goal);
    expect(project.phase).toBe("onboarding");
    expect(project.status).toBe("active");
    expect(payload.enqueued).toBe(true);

    const workItem = await getDb().query.workItems.findFirst({
      where: eq(workItems.targetId, stringValue(project.id)),
    });
    expect(workItem?.purpose).toBe(CLAUDE_MANAGER_RESEARCH_PROJECT_WORK_ITEM_PURPOSE);
    expect(workItem?.targetKind).toBe("researchProject");
  });

  test("POST /api/research-projects rejects a second active project", async () => {
    const app = createApp({ mode: { kind: "prod", webRoot: tempRoot } });

    const firstResponse = await app.request("/api/research-projects", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ goal: "Establish the first baseline." }),
    });
    expect(firstResponse.status).toBe(200);

    const secondResponse = await app.request("/api/research-projects", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ goal: "Start another independent run." }),
    });

    expect(secondResponse.status).toBe(409);
    const payload = jsonRecord(await secondResponse.json());
    expect(String(payload.error)).toContain("Research is already running");
    expect((await researchProjectRepository.list()).map((item) => item.goal)).toEqual([
      "Establish the first baseline.",
    ]);
  });

  test("enqueueManagerResearchProjectWork creates one Manager run for an active project", async () => {
    const project = await researchProjectRepository.create({
      goal: "Gather enough context to present a baseline.",
    });

    const enqueued = await enqueueManagerResearchProjectWork({
      researchProjectId: project.id,
    });

    if (!enqueued) {
      throw new Error("Expected ResearchProject work to enqueue.");
    }
    const storedProject = await researchProjectRepository.require({
      researchProjectId: project.id,
    });
    expect(storedProject.status).toBe("active");

    const workItem = await getDb().query.workItems.findFirst({
      where: eq(workItems.id, enqueued.workItemId),
    });
    expect(workItem?.purpose).toBe(CLAUDE_MANAGER_RESEARCH_PROJECT_WORK_ITEM_PURPOSE);
    expect(workItem?.targetKind).toBe("researchProject");
    expect(workItem?.targetId).toBe(project.id);
    const workPayload = jsonRecord(JSON.parse(workItem?.payloadJson ?? "{}"));
    expect(workPayload.researchProjectId).toBe(project.id);
    expect(workPayload.researchProjectPhase).toBe("onboarding");
    expect(stringValue(workPayload.content)).toContain(`ResearchProject id: ${project.id}`);
    expect(stringValue(workPayload.content)).toContain("ask_user_question");
    expect(stringValue(workPayload.content)).toContain("create_project_baseline");
    expect(stringValue(workPayload.content)).toContain("present_baseline_for_confirmation");

    const run = await getDb().query.claudeAgentRuns.findFirst({
      where: eq(claudeAgentRuns.id, enqueued.claudeAgentRunId),
    });
    expect(run?.status).toBe("queued");
    expect(run?.workItemId).toBe(enqueued.workItemId);

    await expect(
      enqueueManagerResearchProjectWork({ researchProjectId: project.id }),
    ).resolves.toBeUndefined();
  });

  test("dispatchActiveResearchProject picks up the next active project", async () => {
    const project = await researchProjectRepository.create({
      goal: "Dispatch this project through scheduler behavior.",
    });

    await dispatchActiveResearchProject();

    const workItem = await getDb().query.workItems.findFirst({
      where: eq(workItems.targetId, project.id),
    });
    expect(workItem?.purpose).toBe(CLAUDE_MANAGER_RESEARCH_PROJECT_WORK_ITEM_PURPOSE);
    expect(workItem?.targetKind).toBe("researchProject");
  });

  test("answering a pending interaction re-enqueues Manager work", async () => {
    const app = createApp({ mode: { kind: "prod", webRoot: tempRoot } });
    const project = await researchProjectRepository.create({
      goal: "Ask for missing context, then continue onboarding.",
    });
    const interaction = await researchProjectInteractionRepository.create({
      researchProjectId: project.id,
      kind: "question",
      prompt: "Which baseline should define success?",
      details: "The manager is blocked on one user decision.",
    });

    expect(
      (await researchProjectRepository.require({ researchProjectId: project.id })).status,
    ).toBe("blocked_on_user");

    const response = await app.request(
      `/api/research-project-interactions/${interaction.id}/answer`,
      {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ response: "Use the existing test suite pass rate." }),
      },
    );

    expect(response.status).toBe(200);
    const payload = jsonRecord(await response.json());
    expect(payload.enqueued).toBe(true);
    expect(
      (await researchProjectInteractionRepository.require({ interactionId: interaction.id }))
        .response,
    ).toBe("Use the existing test suite pass rate.");
    expect(
      (await researchProjectRepository.require({ researchProjectId: project.id })).status,
    ).toBe("active");

    const workItem = await getDb().query.workItems.findFirst({
      where: eq(workItems.targetId, project.id),
    });
    expect(workItem?.purpose).toBe(CLAUDE_MANAGER_RESEARCH_PROJECT_WORK_ITEM_PURPOSE);
    const workPayload = jsonRecord(JSON.parse(workItem?.payloadJson ?? "{}"));
    expect(stringValue(workPayload.content)).toContain(
      "User response: Use the existing test suite pass rate.",
    );
  });

  test("confirming a baseline advances the project into search", async () => {
    const app = createApp({ mode: { kind: "prod", webRoot: tempRoot } });
    const project = await researchProjectRepository.create({
      goal: "Confirm the onboarding baseline before opening the rest of the workspace.",
    });
    const baseline = await createOrUpdateProjectBaseline({
      researchProjectId: project.id,
      title: "Confirmed project baseline",
      summary: "Baseline summary and proposed next steps.",
    });
    const interaction = await researchProjectInteractionRepository.create({
      researchProjectId: project.id,
      kind: "baseline_confirmation",
      prompt: "Is this baseline ready?",
      details: "Baseline summary and proposed next steps.",
      payload: { baselineId: baseline.id },
    });

    const response = await app.request(
      `/api/research-project-interactions/${interaction.id}/confirm`,
      {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ response: "Confirmed." }),
      },
    );

    expect(response.status).toBe(200);
    const payload = jsonRecord(await response.json());
    expect(jsonRecord(payload.researchProject).phase).toBe("search");
    expect(payload.enqueued).toBe(true);

    const storedProject = await researchProjectRepository.require({
      researchProjectId: project.id,
    });
    expect(storedProject.phase).toBe("search");
    expect(storedProject.status).toBe("active");
    expect(storedProject.baselineSummary).toBe("Baseline summary and proposed next steps.");
    expect((await baselineRepository.require({ baselineId: baseline.id })).status).toBe("accepted");

    const workItem = await getDb().query.workItems.findFirst({
      where: eq(workItems.targetId, project.id),
    });
    const workPayload = jsonRecord(JSON.parse(workItem?.payloadJson ?? "{}"));
    expect(workPayload.researchProjectPhase).toBe("search");
  });

  test("ResearchTask dispatch targets Scientist and Verifier work", async () => {
    const project = await createSearchProject({ goal: "Run a verified task." });
    const task = await researchTaskRepository.create({
      researchProjectId: project.id,
      type: "explore",
      title: "Inspect task flow",
      workerPrompt: "Inspect the task flow and record evidence.",
      verificationPrompt: "Check that the evidence supports the worker summary.",
    });

    const scientistWork = await enqueueScientistResearchTaskWork({ researchTaskId: task.id });
    if (scientistWork.status !== "enqueued") {
      throw new Error("Expected Scientist work to enqueue.");
    }
    const scientistWorkItem = await getDb().query.workItems.findFirst({
      where: eq(workItems.id, scientistWork.workItemId),
    });
    expect(scientistWorkItem?.purpose).toBe(CLAUDE_SCIENTIST_RESEARCH_TASK_WORK_ITEM_PURPOSE);
    expect(scientistWorkItem?.targetKind).toBe("researchTask");
    expect((await researchTaskRepository.require({ researchTaskId: task.id })).status).toBe(
      "running",
    );

    await researchTaskRepository.transition({
      researchTaskId: task.id,
      status: "awaiting_verification",
      resultSummary: "Worker inspected the flow.",
    });
    const verifierWork = await enqueueVerifierResearchTaskWork({ researchTaskId: task.id });
    if (!verifierWork) {
      throw new Error("Expected Verifier work to enqueue.");
    }
    const verifierWorkItem = await getDb().query.workItems.findFirst({
      where: eq(workItems.id, verifierWork.workItemId),
    });
    expect(verifierWorkItem?.purpose).toBe(CLAUDE_VERIFIER_RESEARCH_TASK_WORK_ITEM_PURPOSE);
    expect(verifierWorkItem?.targetKind).toBe("researchTask");
    expect(jsonRecord(JSON.parse(verifierWorkItem?.payloadJson ?? "{}")).activeResearchTaskId).toBe(
      task.id,
    );
  });

  test("planned verify ResearchTasks route directly to Verifier", async () => {
    const project = await createSearchProject({
      goal: "Verify evidence without Scientist implementation.",
    });
    const task = await researchTaskRepository.create({
      researchProjectId: project.id,
      type: "verify",
      title: "Check duplicate hypothesis",
      workerPrompt: "Verify whether the proposed hypothesis duplicates existing evidence.",
      verificationPrompt: "Record a verification judgment with durable evidence references.",
    });

    await expect(
      enqueueScientistResearchTaskWork({ researchTaskId: task.id }),
    ).resolves.toMatchObject({ status: "skipped", reason: "verifier_owned_task" });

    await dispatchPlannedResearchTask();

    const storedTask = await researchTaskRepository.require({ researchTaskId: task.id });
    expect(storedTask.status).toBe("awaiting_verification");
    expect(storedTask.resultSummary).toContain("Verifier-owned ResearchTask");

    const workItem = await getDb().query.workItems.findFirst({
      where: eq(workItems.targetId, task.id),
    });
    expect(workItem?.purpose).toBe(CLAUDE_VERIFIER_RESEARCH_TASK_WORK_ITEM_PURPOSE);
    expect(workItem?.targetKind).toBe("researchTask");
    const workPayload = jsonRecord(JSON.parse(workItem?.payloadJson ?? "{}"));
    expect(workPayload.activeResearchTaskId).toBe(task.id);
    expect(stringValue(workPayload.content)).toContain("situ-verifier-verify-task");

    const scientistWork = await getDb().query.workItems.findFirst({
      where: eq(workItems.purpose, CLAUDE_SCIENTIST_RESEARCH_TASK_WORK_ITEM_PURPOSE),
    });
    expect(scientistWork).toBeUndefined();
  });

  test("planned ResearchTasks wait for confirmed project baseline", async () => {
    const project = await researchProjectRepository.create({
      goal: "Do not run candidates before a confirmed project baseline.",
    });
    const exploitTask = await researchTaskRepository.create({
      researchProjectId: project.id,
      type: "exploit",
      title: "Try depth twelve",
      workerPrompt: "Run the DEPTH=12 candidate.",
      verificationPrompt: "Reject if the project baseline is not confirmed.",
    });

    await expect(
      enqueueScientistResearchTaskWork({ researchTaskId: exploitTask.id }),
    ).resolves.toMatchObject({ status: "skipped", reason: "project_phase_not_search" });
    await dispatchPlannedResearchTask();

    expect((await researchTaskRepository.require({ researchTaskId: exploitTask.id })).status).toBe(
      "planned",
    );
    const scientistWork = await getDb().query.workItems.findFirst({
      where: eq(workItems.purpose, CLAUDE_SCIENTIST_RESEARCH_TASK_WORK_ITEM_PURPOSE),
    });
    expect(scientistWork).toBeUndefined();

    const managerWork = await getDb().query.workItems.findFirst({
      where: eq(workItems.purpose, CLAUDE_MANAGER_RESEARCH_PROJECT_WORK_ITEM_PURPOSE),
    });
    expect(managerWork?.targetKind).toBe("researchProject");
    expect(managerWork?.targetId).toBe(project.id);
  });

  test("exploit ResearchTasks run in search without Scientist-created baseline evidence", async () => {
    const project = await createSearchProject({
      goal: "Run queued candidates after setup baseline confirmation.",
    });
    const exploitTask = await researchTaskRepository.create({
      researchProjectId: project.id,
      type: "exploit",
      title: "Try queued candidate",
      workerPrompt: "Run the candidate after setup baseline confirmation.",
      verificationPrompt: "Compare against the confirmed setup baseline.",
    });

    await dispatchPlannedResearchTask();

    expect((await researchTaskRepository.require({ researchTaskId: exploitTask.id })).status).toBe(
      "running",
    );
    const workItem = await getDb().query.workItems.findFirst({
      where: eq(workItems.targetId, exploitTask.id),
    });
    expect(workItem?.purpose).toBe(CLAUDE_SCIENTIST_RESEARCH_TASK_WORK_ITEM_PURPOSE);
  });

  test("compute-blocked tasks do not stall later runnable tasks", async () => {
    const project = await createSearchProject({
      goal: "Skip blocked compute work and keep dispatching.",
    });
    const blockedTask = await researchTaskRepository.create({
      researchProjectId: project.id,
      type: "explore",
      title: "Run missing gpu task",
      workerPrompt: "Run a command that needs a gpu pool.",
      verificationPrompt: "Check the command output.",
      payload: { compute: { pool: "gpu" } },
    });
    const runnableTask = await researchTaskRepository.create({
      researchProjectId: project.id,
      type: "explore",
      title: "Run local task",
      workerPrompt: "Run a command without compute.",
      verificationPrompt: "Check the command output.",
    });
    orderPlannedTasks({
      firstResearchTaskId: blockedTask.id,
      secondResearchTaskId: runnableTask.id,
    });

    await dispatchPlannedResearchTask();

    expect((await researchTaskRepository.require({ researchTaskId: blockedTask.id })).status).toBe(
      "planned",
    );
    expect((await researchTaskRepository.require({ researchTaskId: runnableTask.id })).status).toBe(
      "running",
    );
    const workItem = await getDb().query.workItems.findFirst({
      where: eq(workItems.targetId, runnableTask.id),
    });
    expect(workItem?.purpose).toBe(CLAUDE_SCIENTIST_RESEARCH_TASK_WORK_ITEM_PURPOSE);
    expect(computeBlockedEvents()).toEqual([
      {
        researchTaskId: blockedTask.id,
        pool: "gpu",
        reason: "compute_pool_missing",
      },
    ]);
  });

  test("busy compute tasks do not stall later runnable tasks", async () => {
    await computeTargetRepository.upsert({
      computeTargetId: "target-busy-gpu",
      pool: "gpu",
      kind: "local",
    });
    const project = await createSearchProject({
      goal: "Skip busy compute work and keep dispatching.",
    });
    const ownerTask = await researchTaskRepository.create({
      researchProjectId: project.id,
      type: "explore",
      title: "Own gpu target",
      workerPrompt: "Hold the gpu target.",
      verificationPrompt: "Check ownership.",
    });
    await researchTaskRepository.claimPlanned({ researchTaskId: ownerTask.id });
    await computeTargetRepository.claimForPool({
      pool: "gpu",
      researchTaskId: ownerTask.id,
    });
    const blockedTask = await researchTaskRepository.create({
      researchProjectId: project.id,
      type: "explore",
      title: "Run busy gpu task",
      workerPrompt: "Run a command that needs the busy gpu pool.",
      verificationPrompt: "Check the command output.",
      payload: { compute: { pool: "gpu" } },
    });
    const runnableTask = await researchTaskRepository.create({
      researchProjectId: project.id,
      type: "explore",
      title: "Run local task",
      workerPrompt: "Run a command without compute.",
      verificationPrompt: "Check the command output.",
    });
    orderPlannedTasks({
      firstResearchTaskId: blockedTask.id,
      secondResearchTaskId: runnableTask.id,
    });

    await dispatchPlannedResearchTask();

    expect((await researchTaskRepository.require({ researchTaskId: blockedTask.id })).status).toBe(
      "planned",
    );
    expect((await researchTaskRepository.require({ researchTaskId: runnableTask.id })).status).toBe(
      "running",
    );
    expect(computeBlockedEvents()).toEqual([
      {
        researchTaskId: blockedTask.id,
        pool: "gpu",
        reason: "compute_pool_busy",
      },
    ]);
  });

  test("dispatchPlannedResearchTask drains multiple planned tasks in one tick", async () => {
    const project = await createSearchProject({
      goal: "Drain planned ResearchTasks without one-per-tick latency.",
    });
    const tasks = await Promise.all(
      [0, 1, 2, 3].map((index) =>
        researchTaskRepository.create({
          researchProjectId: project.id,
          type: "explore",
          title: `Inspect task ${index}`,
          workerPrompt: `Inspect task ${index} and record evidence.`,
          verificationPrompt: "Check that the evidence supports the worker summary.",
        }),
      ),
    );

    await dispatchPlannedResearchTask();

    for (const task of tasks) {
      expect((await researchTaskRepository.require({ researchTaskId: task.id })).status).toBe(
        "running",
      );
    }
    const scientistWorkItems = await getDb()
      .select()
      .from(workItems)
      .where(eq(workItems.purpose, CLAUDE_SCIENTIST_RESEARCH_TASK_WORK_ITEM_PURPOSE));
    expect(scientistWorkItems).toHaveLength(4);
  });

  test("dispatchPlannedResearchTask Scientist enqueues cap at MAX_SITU_SCIENTIST_CONCURRENCY per tick", async () => {
    const previous = process.env.MAX_SITU_SCIENTIST_CONCURRENCY;
    process.env.MAX_SITU_SCIENTIST_CONCURRENCY = "2";
    try {
      const project = await createSearchProject({
        goal: "Cap per-tick Scientist enqueues at the configured concurrency.",
      });
      const tasks = await Promise.all(
        [0, 1, 2, 3, 4].map((index) =>
          researchTaskRepository.create({
            researchProjectId: project.id,
            type: "explore",
            title: `Capped task ${index}`,
            workerPrompt: `Inspect task ${index} and record evidence.`,
            verificationPrompt: "Check that the evidence supports the worker summary.",
          }),
        ),
      );

      await dispatchPlannedResearchTask();

      const runningCount = (
        await Promise.all(
          tasks.map((task) =>
            researchTaskRepository
              .require({ researchTaskId: task.id })
              .then((stored) => (stored.status === "running" ? 1 : 0)),
          ),
        )
      ).reduce<number>((acc, value) => acc + value, 0);
      expect(runningCount).toBe(2);
      const scientistWorkItems = await getDb()
        .select()
        .from(workItems)
        .where(eq(workItems.purpose, CLAUDE_SCIENTIST_RESEARCH_TASK_WORK_ITEM_PURPOSE));
      expect(scientistWorkItems).toHaveLength(2);
    } finally {
      if (previous === undefined) {
        delete process.env.MAX_SITU_SCIENTIST_CONCURRENCY;
      } else {
        process.env.MAX_SITU_SCIENTIST_CONCURRENCY = previous;
      }
    }
  });

  test("dispatchAwaitingResearchTaskVerification drains multiple awaiting tasks in one tick", async () => {
    const project = await createSearchProject({
      goal: "Drain awaiting verifications without one-per-tick latency.",
    });
    const tasks = await Promise.all(
      [0, 1, 2].map((index) =>
        researchTaskRepository.create({
          researchProjectId: project.id,
          type: "explore",
          title: `Awaiting task ${index}`,
          workerPrompt: `Inspect task ${index}.`,
          verificationPrompt: "Verify the evidence.",
        }),
      ),
    );
    for (const task of tasks) {
      await researchTaskRepository.claimPlanned({ researchTaskId: task.id });
      await researchTaskRepository.transition({
        researchTaskId: task.id,
        status: "awaiting_verification",
        resultSummary: "Worker inspected the flow.",
      });
    }

    await dispatchAwaitingResearchTaskVerification();

    const verifierWorkItems = await getDb()
      .select()
      .from(workItems)
      .where(eq(workItems.purpose, CLAUDE_VERIFIER_RESEARCH_TASK_WORK_ITEM_PURPOSE));
    expect(verifierWorkItems).toHaveLength(3);
  });

  test("non-compute Scientist enqueue skips emit research_task.enqueue_skipped events", async () => {
    const project = await createSearchProject({
      goal: "Surface Scientist skip reasons in the app event feed.",
    });
    const verifyTask = await researchTaskRepository.create({
      researchProjectId: project.id,
      type: "verify",
      title: "Verify hypothesis duplication",
      workerPrompt: "Verify whether the hypothesis duplicates evidence.",
      verificationPrompt: "Record a verification judgment.",
    });
    const blockedProject = await researchProjectRepository.create({
      goal: "Surface project phase skip reasons in the app event feed.",
    });
    const blockedTask = await researchTaskRepository.create({
      researchProjectId: blockedProject.id,
      type: "exploit",
      title: "Try a candidate before baseline",
      workerPrompt: "Run a candidate variant.",
      verificationPrompt: "Reject without baseline evidence.",
    });
    const exploreTask = await researchTaskRepository.create({
      researchProjectId: project.id,
      type: "explore",
      title: "Inspect the flow",
      workerPrompt: "Inspect the flow and record evidence.",
      verificationPrompt: "Check the recorded evidence.",
    });

    await expect(
      enqueueScientistResearchTaskWork({ researchTaskId: verifyTask.id }),
    ).resolves.toMatchObject({ status: "skipped", reason: "verifier_owned_task" });
    await expect(
      enqueueScientistResearchTaskWork({ researchTaskId: blockedTask.id }),
    ).resolves.toMatchObject({ status: "skipped", reason: "project_phase_not_search" });
    const enqueued = await enqueueScientistResearchTaskWork({
      researchTaskId: exploreTask.id,
    });
    expect(enqueued.status).toBe("enqueued");
    await expect(
      enqueueScientistResearchTaskWork({ researchTaskId: exploreTask.id }),
    ).resolves.toMatchObject({ status: "skipped", reason: "task_not_planned" });

    expect(enqueueSkippedEvents()).toEqual(
      expect.arrayContaining([
        { researchTaskId: verifyTask.id, reason: "verifier_owned_task" },
        { researchTaskId: blockedTask.id, reason: "project_phase_not_search" },
        { researchTaskId: exploreTask.id, reason: "task_not_planned" },
      ]),
    );
    expect(enqueueSkippedEvents()).toHaveLength(3);
  });

  test("repeat Scientist enqueue skips de-dupe app events per (task, reason)", async () => {
    const project = await researchProjectRepository.create({
      goal: "De-dupe repeated Scientist skip events.",
    });
    const exploitTask = await researchTaskRepository.create({
      researchProjectId: project.id,
      type: "exploit",
      title: "Try a candidate before baseline",
      workerPrompt: "Run a candidate variant.",
      verificationPrompt: "Reject without baseline evidence.",
    });

    for (let attempt = 0; attempt < 3; attempt++) {
      await expect(
        enqueueScientistResearchTaskWork({ researchTaskId: exploitTask.id }),
      ).resolves.toMatchObject({
        status: "skipped",
        reason: "project_phase_not_search",
      });
    }

    expect(enqueueSkippedEvents()).toEqual([
      { researchTaskId: exploitTask.id, reason: "project_phase_not_search" },
    ]);
  });

  test("exploit ResearchTasks still run with verified baseline evidence in search phase", async () => {
    const project = await createSearchProject({
      goal: "Run candidates after a verified baseline.",
    });
    const baselineTask = await researchTaskRepository.create({
      researchProjectId: project.id,
      type: "explore",
      title: "Measure baseline",
      workerPrompt: "Run the unmodified baseline.",
      verificationPrompt: "Check that baseline metrics are durable.",
    });
    await baselineRepository.create({
      researchProjectId: project.id,
      title: "Verified baseline",
      summary: "Baseline metric is durable.",
      createdByResearchTaskId: baselineTask.id,
    });
    await verifyResearchTask({
      researchTaskId: baselineTask.id,
      verificationPrompt: baselineTask.verificationPrompt,
    });
    const exploitTask = await researchTaskRepository.create({
      researchProjectId: project.id,
      type: "exploit",
      title: "Try depth twelve",
      workerPrompt: "Run the DEPTH=12 candidate.",
      verificationPrompt: "Compare against the verified baseline.",
    });

    await dispatchPlannedResearchTask();

    expect((await researchTaskRepository.require({ researchTaskId: exploitTask.id })).status).toBe(
      "running",
    );
    const workItem = await getDb().query.workItems.findFirst({
      where: eq(workItems.targetId, exploitTask.id),
    });
    expect(workItem?.purpose).toBe(CLAUDE_SCIENTIST_RESEARCH_TASK_WORK_ITEM_PURPOSE);
  });

  test("Replicache pull exposes ResearchProject collections", async () => {
    const app = createApp({ mode: { kind: "prod", webRoot: tempRoot } });
    const project = await researchProjectRepository.create({
      goal: "Expose this project in the client read model.",
    });
    const interaction = await researchProjectInteractionRepository.create({
      researchProjectId: project.id,
      kind: "question",
      prompt: "Which baseline should be shown?",
      details: "Needed for user approval.",
    });
    const task = await researchTaskRepository.create({
      researchProjectId: project.id,
      type: "explore",
      title: "Replicache task",
      workerPrompt: "Show this task in Replicache.",
      verificationPrompt: "Verify the task syncs.",
    });

    const response = await app.request("/api/replicache/pull", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ pullVersion: 1, cookie: 0 }),
    });

    expect(response.status).toBe(200);
    const payload = jsonRecord(await response.json());
    const patch = patchOperations(payload.patch);
    const projectPut = putOperation({
      patch,
      key: `researchProjects/${project.id}`,
    });
    const projectValue = jsonRecord(projectPut.value);
    expect(projectValue.goal).toBe("Expose this project in the client read model.");
    expect(projectValue.payload).toEqual({});
    expect(projectValue).not.toHaveProperty("payloadJson");
    expect(projectValue).not.toHaveProperty("syncVersion");
    expect(projectValue).not.toHaveProperty("syncDeleted");

    const interactionPut = putOperation({
      patch,
      key: `researchProjectInteractions/${interaction.id}`,
    });
    const interactionValue = jsonRecord(interactionPut.value);
    expect(interactionValue.researchProjectId).toBe(project.id);
    expect(interactionValue.prompt).toBe("Which baseline should be shown?");

    const taskPut = putOperation({
      patch,
      key: `researchTasks/${task.id}`,
    });
    const taskValue = jsonRecord(taskPut.value);
    expect(taskValue.researchProjectId).toBe(project.id);
    expect(taskValue.payload).toEqual({});
    expect(taskValue).not.toHaveProperty("payloadJson");
  });
});

type PatchOperationValue = {
  op: string;
  key?: string;
  value?: unknown;
};

function resetTables(): void {
  const db = getDb();
  db.delete(appEvents).run();
  db.delete(claudeAgentRuns).run();
  db.delete(workItems).run();
  db.delete(computeTargets).run();
  db.delete(researchTaskVerifications).run();
  db.delete(baselineActivities).run();
  db.delete(baselines).run();
  db.delete(researchTasks).run();
  db.delete(researchProjectInteractions).run();
  db.delete(researchProjects).run();
}

async function createSearchProject({
  goal,
}: {
  goal: string;
}): Promise<Awaited<ReturnType<typeof researchProjectRepository.create>>> {
  const project = await researchProjectRepository.create({ goal });
  return researchProjectRepository.updatePhase({
    researchProjectId: project.id,
    phase: "search",
    baselineSummary: "Confirmed setup baseline.",
  });
}

function computeBlockedEvents(): Array<{
  researchTaskId: string;
  pool: string;
  reason: string;
}> {
  return getDb()
    .select()
    .from(appEvents)
    .where(eq(appEvents.type, "research_task.compute_blocked"))
    .all()
    .map((event) => {
      const payload = jsonRecord(JSON.parse(event.payloadJson));
      return {
        researchTaskId: stringValue(payload.researchTaskId),
        pool: stringValue(payload.pool),
        reason: stringValue(payload.reason),
      };
    });
}

function orderPlannedTasks({
  firstResearchTaskId,
  secondResearchTaskId,
}: {
  firstResearchTaskId: string;
  secondResearchTaskId: string;
}): void {
  getDb()
    .update(researchTasks)
    .set({ createdAt: "2026-05-11T00:00:00.000Z" })
    .where(eq(researchTasks.id, firstResearchTaskId))
    .run();
  getDb()
    .update(researchTasks)
    .set({ createdAt: "2026-05-11T00:00:01.000Z" })
    .where(eq(researchTasks.id, secondResearchTaskId))
    .run();
}

function enqueueSkippedEvents(): Array<{
  researchTaskId: string;
  reason: string;
}> {
  return getDb()
    .select()
    .from(appEvents)
    .where(eq(appEvents.type, "research_task.enqueue_skipped"))
    .all()
    .map((event) => {
      const payload = jsonRecord(JSON.parse(event.payloadJson));
      return {
        researchTaskId: stringValue(payload.researchTaskId),
        reason: stringValue(payload.reason),
      };
    });
}

async function verifyResearchTask({
  researchTaskId,
  verificationPrompt,
}: {
  researchTaskId: string;
  verificationPrompt: string;
}): Promise<void> {
  await researchTaskRepository.claimPlanned({ researchTaskId });
  await researchTaskRepository.transition({
    researchTaskId,
    status: "awaiting_verification",
    resultSummary: "Worker produced durable baseline evidence.",
  });
  await researchTaskVerificationRepository.create({
    researchTaskId,
    status: "passed",
    verifierPrompt: verificationPrompt,
    judgment: "Baseline evidence passed verification.",
    evidenceSummary: "Baseline record and metric output are durable.",
  });
}

function restoreEnv(): void {
  setEnv("SITU_HOME", originalEnv.SITU_HOME);
  setEnv("SITU_REPO_PATH", originalEnv.SITU_REPO_PATH);
  setEnv("SITU_DB_PATH", originalEnv.SITU_DB_PATH);
  setEnv("SITU_ANTHROPIC_KEY", originalEnv.SITU_ANTHROPIC_KEY);
}

function setEnv(key: keyof typeof originalEnv, value: string | undefined): void {
  if (value === undefined) {
    delete process.env[key];
    return;
  }
  process.env[key] = value;
}

function patchOperations(value: unknown): PatchOperationValue[] {
  if (!Array.isArray(value)) {
    throw new Error("Expected Replicache patch array.");
  }
  return value.map((item) => jsonRecord(item) as PatchOperationValue);
}

function putOperation({
  patch,
  key,
}: {
  patch: PatchOperationValue[];
  key: string;
}): PatchOperationValue {
  const operation = patch.find((item) => item.op === "put" && item.key === key);
  if (!operation) {
    throw new Error(`Missing Replicache put operation for key: ${key}`);
  }
  return operation;
}

function jsonRecord(value: unknown): Record<string, unknown> {
  if (typeof value !== "object" || value === null || Array.isArray(value)) {
    throw new Error("Expected object value.");
  }
  return value as Record<string, unknown>;
}

function stringValue(value: unknown): string {
  if (typeof value !== "string") {
    throw new Error("Expected string value.");
  }
  return value;
}
