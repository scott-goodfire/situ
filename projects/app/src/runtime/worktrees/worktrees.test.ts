import { existsSync } from "node:fs";
import { mkdtemp, mkdir, readFile, realpath, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { beforeAll, describe, expect, test } from "bun:test";
import { and, eq } from "drizzle-orm";

import { claudeAgentToolDefinitionByName } from "../../claude/agents/tools";
import { ensureRuntimeContext } from "../../config/session-context";
import { getDb } from "../../data/db/client";
import {
  artifacts,
  evaluations,
  experimentActivities,
  experiments,
  measurements,
  workItems,
} from "../../data/db/schema";
import { baselineRepository } from "../../data/repositories/baselines";
import { computeTargetRepository } from "../../data/repositories/compute-targets";
import { experimentRepository } from "../../data/repositories/experiments";
import { hypothesisRepository } from "../../data/repositories/hypotheses";
import { researchProjectRepository } from "../../data/repositories/research-projects";
import {
  researchTaskRepository,
  type ResearchTaskRecord,
} from "../../data/repositories/research-tasks";
import { enqueueScientistResearchTaskWork } from "../dispatch";
import { CLAUDE_SCIENTIST_RESEARCH_TASK_WORK_ITEM_PURPOSE } from "../work-items";
import {
  captureExperimentCandidate,
  prepareExperimentWorktree,
  runExperimentWorkspaceCommand,
  type WorktreeRuntimeContext,
} from ".";

let repoPath: string;
let runtime: WorktreeRuntimeContext;

describe("experiment worktrees", () => {
  beforeAll(async () => {
    const root = await mkdtemp(join(tmpdir(), "situ-worktrees-"));
    repoPath = join(root, "repo");
    const sessionHome = join(root, "situ", "sessions", "ses_test");
    await mkdir(repoPath, { recursive: true });
    repoPath = await realpath(repoPath);
    await mkdir(sessionHome, { recursive: true });
    process.env.SITU_HOME = join(root, "situ");
    process.env.SITU_REPO_PATH = repoPath;
    process.env.SITU_DB_PATH = join(sessionHome, "session.sqlite");

    await git({ cwd: repoPath, args: ["init", "--initial-branch", "main"] });
    await writeFile(join(repoPath, "README.md"), "baseline\n");
    await writeFile(join(repoPath, ".gitignore"), "__pycache__/\n*.py[cod]\n");
    await git({ cwd: repoPath, args: ["add", "README.md", ".gitignore"] });
    await git({
      cwd: repoPath,
      args: [
        "-c",
        "user.name=situ Test",
        "-c",
        "user.email=situ-test@local.invalid",
        "commit",
        "-m",
        "initial",
      ],
    });

    runtime = { repoPath, sessionHome };
    await ensureRuntimeContext({ sessionId: "ses_test" });
  });

  test("prepareExperimentWorktree creates a detached worktree and persists base metadata", async () => {
    const experiment = await createExperiment();
    const baseCommit = await git({ cwd: repoPath, args: ["rev-parse", "HEAD"] });

    const result = await prepareExperimentWorktree({
      experimentId: experiment.id,
      runtime,
    });

    expect(result.experimentId).toBe(experiment.id);
    expect(result.baseCommit).toBe(baseCommit);
    expect(existsSync(join(result.worktreePath, "README.md"))).toBe(true);
    expect(await git({ cwd: result.worktreePath, args: ["rev-parse", "HEAD"] })).toBe(baseCommit);

    const stored = await getDb().query.experiments.findFirst({
      where: eq(experiments.id, experiment.id),
    });
    expect(stored?.worktreePath).toBe(result.worktreePath);
    expect(stored?.baseCommit).toBe(baseCommit);

    const activities = await getDb()
      .select()
      .from(experimentActivities)
      .where(eq(experimentActivities.experimentId, experiment.id));
    expect(
      activities.some((activity) => activity.payloadJson.includes("experiment_worktree_created")),
    ).toBe(true);
  });

  test("captureExperimentCandidate commits worktree changes and records a patch artifact", async () => {
    const experiment = await createExperiment();
    const prepared = await prepareExperimentWorktree({
      experimentId: experiment.id,
      runtime,
    });
    await writeFile(join(prepared.worktreePath, "candidate.txt"), "candidate\n");

    const result = await captureExperimentCandidate({
      experimentId: experiment.id,
      runtime,
    });

    expect(result.baseCommit).toBe(prepared.baseCommit);
    expect(result.candidateCommit).toBeTruthy();
    expect(result.candidateCommit).not.toBe(prepared.baseCommit);
    expect(result.patchArtifactId).toBeTruthy();

    const stored = await getDb().query.experiments.findFirst({
      where: eq(experiments.id, experiment.id),
    });
    expect(stored?.candidateCommit).toBe(result.candidateCommit);

    const artifact = await getDb().query.artifacts.findFirst({
      where: eq(artifacts.id, result.patchArtifactId ?? ""),
    });
    expect(artifact?.entityKind).toBe("experiment");
    expect(artifact?.entityId).toBe(experiment.id);
    expect(artifact?.kind).toBe("patch");
    expect(artifact?.body).toBe("");
    expect(artifact?.mediaType).toBe("text/x-patch");
    expect(artifact?.sizeBytes ?? 0).toBeGreaterThan(0);
    expect(await readFile(artifact?.path ?? "", "utf8")).toContain("candidate.txt");
  });

  test("child experiment worktrees start from parent candidate commits", async () => {
    const sourceHead = await git({ cwd: repoPath, args: ["rev-parse", "HEAD"] });
    const parentTask = await createResearchTask();
    const parentExperiment = await createExperiment({ researchTaskId: parentTask.id });
    const parentPrepared = await prepareExperimentWorktree({
      experimentId: parentExperiment.id,
      runtime,
    });
    await writeFile(join(parentPrepared.worktreePath, "parent-candidate.txt"), "parent\n");

    const parentCandidate = await captureExperimentCandidate({
      experimentId: parentExperiment.id,
      runtime,
    });
    if (!parentCandidate.candidateCommit) {
      throw new Error("Expected parent candidate commit.");
    }
    await researchTaskRepository.transition({
      researchTaskId: parentTask.id,
      status: "verified",
    });

    const childExperiment = await createExperiment({
      parentExperimentId: parentExperiment.id,
    });
    const childPrepared = await prepareExperimentWorktree({
      experimentId: childExperiment.id,
      runtime,
    });

    expect(childPrepared.baseCommit).toBe(parentCandidate.candidateCommit);
    expect(await git({ cwd: childPrepared.worktreePath, args: ["rev-parse", "HEAD"] })).toBe(
      parentCandidate.candidateCommit,
    );
    expect(await readFile(join(childPrepared.worktreePath, "parent-candidate.txt"), "utf8")).toBe(
      "parent\n",
    );
    expect(await git({ cwd: repoPath, args: ["rev-parse", "HEAD"] })).toBe(sourceHead);

    const stored = await getDb().query.experiments.findFirst({
      where: eq(experiments.id, childExperiment.id),
    });
    expect(stored?.baseCommit).toBe(parentCandidate.candidateCommit);
  });

  test("child experiment worktree rejects parent experiments without candidate commits", async () => {
    const parentTask = await createResearchTask();
    const parentExperiment = await createExperiment({ researchTaskId: parentTask.id });
    await researchTaskRepository.transition({
      researchTaskId: parentTask.id,
      status: "verified",
    });
    const childExperiment = await createExperiment({
      parentExperimentId: parentExperiment.id,
    });

    await expect(
      prepareExperimentWorktree({
        experimentId: childExperiment.id,
        runtime,
      }),
    ).rejects.toThrow(`Parent experiment has no captured candidate commit: ${parentExperiment.id}`);
  });

  test("child experiment worktree rejects unverified parent experiment tasks", async () => {
    const parentTask = await createResearchTask();
    const parentExperiment = await createExperiment({ researchTaskId: parentTask.id });
    const parentPrepared = await prepareExperimentWorktree({
      experimentId: parentExperiment.id,
      runtime,
    });
    await writeFile(join(parentPrepared.worktreePath, "unverified-parent.txt"), "candidate\n");
    const parentCandidate = await captureExperimentCandidate({
      experimentId: parentExperiment.id,
      runtime,
    });
    if (!parentCandidate.candidateCommit) {
      throw new Error("Expected parent candidate commit.");
    }
    const childExperiment = await createExperiment({
      parentExperimentId: parentExperiment.id,
    });

    await expect(
      prepareExperimentWorktree({
        experimentId: childExperiment.id,
        runtime,
      }),
    ).rejects.toThrow(
      `Parent experiment ResearchTask must be verified before child worktree creation: ${parentExperiment.id}`,
    );
  });

  test("captureExperimentCandidate leaves ignored generated files out of the patch", async () => {
    const experiment = await createExperiment();
    const prepared = await prepareExperimentWorktree({
      experimentId: experiment.id,
      runtime,
    });
    await mkdir(join(prepared.worktreePath, "__pycache__"), { recursive: true });
    await writeFile(
      join(prepared.worktreePath, "__pycache__", "module.cpython-313.pyc"),
      "cache\n",
    );
    await writeFile(join(prepared.worktreePath, "candidate.txt"), "candidate\n");

    const result = await captureExperimentCandidate({
      experimentId: experiment.id,
      runtime,
    });

    const artifact = await getDb().query.artifacts.findFirst({
      where: eq(artifacts.id, result.patchArtifactId ?? ""),
    });
    const patch = await readFile(artifact?.path ?? "", "utf8");
    expect(patch).toContain("candidate.txt");
    expect(patch).not.toContain("__pycache__");
    expect(patch).not.toContain(".pyc");
  });

  test("captureExperimentCandidate leaves metadata unchanged when the worktree is clean", async () => {
    const experiment = await createExperiment();
    await prepareExperimentWorktree({
      experimentId: experiment.id,
      runtime,
    });

    const result = await captureExperimentCandidate({
      experimentId: experiment.id,
      runtime,
    });

    expect(result.candidateCommit).toBeNull();
    expect(result.patchArtifactId).toBeNull();
    const stored = await getDb().query.experiments.findFirst({
      where: eq(experiments.id, experiment.id),
    });
    expect(stored?.candidateCommit).toBeNull();
  });

  test("prepareExperimentWorktree refuses a dirty source workspace by default", async () => {
    const experiment = await createExperiment();
    const dirtyFile = join(repoPath, "dirty.txt");
    await writeFile(dirtyFile, "dirty\n");
    try {
      await expect(
        prepareExperimentWorktree({ experimentId: experiment.id, runtime }),
      ).rejects.toThrow("source workspace has uncommitted changes");
    } finally {
      await rm(dirtyFile, { force: true });
    }
  });

  test("Scientist workspace tools call the worktree boundary and return stable JSON", async () => {
    const experiment = await createExperiment();
    const commandTool = requireTool({ name: "run_workspace_command" });
    const captureTool = requireTool({ name: "capture_experiment_candidate" });

    expect(commandTool.roles).toEqual(["scientist"]);
    expect(captureTool.roles).toEqual(["scientist"]);
    const commandSchema = commandTool.input_schema as {
      required?: string[];
      properties?: Record<string, unknown>;
    };
    expect(commandSchema.required).toEqual(["command", "experimentId"]);
    expect(commandSchema.properties?.experimentId).toBeTruthy();

    const commandEnvelope = JSON.parse(
      (
        await commandTool.handler({
          input: {
            experimentId: experiment.id,
            command: "printf 'candidate from tool\\n' > tool-candidate.txt",
          },
          context: toolContext(),
        })
      ).content,
    ) as {
      ok: true;
      data: {
        command: {
          success: boolean;
          worktreePath: string;
          baseCommit: string;
          changedFiles: string[];
        };
      };
    };
    const command = commandEnvelope.data.command;
    expect(command.success).toBe(true);
    expect(command.worktreePath).toContain(experiment.id);
    expect(command.baseCommit).toBeTruthy();
    expect(command.changedFiles).toContain("tool-candidate.txt");

    const capturedEnvelope = JSON.parse(
      (
        await captureTool.handler({
          input: {
            experimentId: experiment.id,
            commitMessage: "Tool candidate",
          },
          context: toolContext(),
        })
      ).content,
    ) as {
      ok: true;
      data: {
        candidate: {
          candidateCommit: string | null;
          patchArtifactId: string | null;
        };
      };
    };
    const candidate = capturedEnvelope.data.candidate;
    expect(candidate.candidateCommit).toBeTruthy();
    expect(candidate.patchArtifactId).toBeTruthy();
  });

  test("Scientist workspace command tool reads and writes the experiment worktree", async () => {
    const task = await createResearchTask();
    const experiment = await createExperiment({ researchTaskId: task.id });
    const commandTool = requireTool({ name: "run_workspace_command" });

    const written = (
      JSON.parse(
        (
          await commandTool.handler({
            input: {
              experimentId: experiment.id,
              command:
                "mkdir -p src && printf 'candidate from workspace command\\n' > src/candidate.txt",
            },
            context: toolContext({ activeResearchTaskId: task.id }),
          })
        ).content,
      ) as {
        ok: true;
        data: { command: { experimentId: string; worktreePath: string; changedFiles: string[] } };
      }
    ).data.command;

    expect(written.experimentId).toBe(experiment.id);
    expect(written.worktreePath).toContain(experiment.id);
    expect(written.changedFiles).toContain("src/candidate.txt");
    expect(existsSync(join(written.worktreePath, "src/candidate.txt"))).toBe(true);

    const read = (
      JSON.parse(
        (
          await commandTool.handler({
            input: {
              experimentId: experiment.id,
              command: "cat src/candidate.txt",
            },
            context: toolContext({ activeResearchTaskId: task.id }),
          })
        ).content,
      ) as {
        ok: true;
        data: { command: { success: boolean; stdout: string; worktreePath: string } };
      }
    ).data.command;
    expect(read.success).toBe(true);
    expect(read.stdout).toBe("candidate from workspace command\n");
    expect(read.worktreePath).toBe(written.worktreePath);

    const absoluteCwd = (
      JSON.parse(
        (
          await commandTool.handler({
            input: {
              experimentId: experiment.id,
              command: "pwd",
              workingDirectory: written.worktreePath,
            },
            context: toolContext({ activeResearchTaskId: task.id }),
          })
        ).content,
      ) as { ok: true; data: { command: { success: boolean; stdout: string; cwd: string } } }
    ).data.command;
    const realWorktreePath = await realpath(written.worktreePath);
    expect(absoluteCwd.success).toBe(true);
    expect(absoluteCwd.cwd).toBe(realWorktreePath);
    expect(absoluteCwd.stdout.trim()).toBe(realWorktreePath);

    const escape = JSON.parse(
      (
        await commandTool.handler({
          input: {
            experimentId: experiment.id,
            command: "pwd",
            workingDirectory: "..",
          },
          context: toolContext({ activeResearchTaskId: task.id }),
        })
      ).content,
    ) as { ok: false; code: string };
    expect(escape.ok).toBe(false);
    expect(escape.code).toBe("experiment_worktree_path_escape");
  });

  test("Scientist workspace command receives leased compute target env", async () => {
    await computeTargetRepository.upsert({
      computeTargetId: "target-workspace-env",
      pool: "gpu",
      kind: "local",
      label: "GPU env target",
      metadata: { cuda_visible_devices: "7" },
    });
    const task = await createResearchTask({
      type: "explore",
      payload: { compute: { pool: "gpu" } },
    });
    const experiment = await createExperiment({ researchTaskId: task.id });
    const dispatched = await enqueueScientistResearchTaskWork({
      researchTaskId: task.id,
    });
    if (dispatched.status !== "enqueued") {
      throw new Error("Expected Scientist work item to dispatch.");
    }

    const workItem = await getDb().query.workItems.findFirst({
      where: and(
        eq(workItems.id, dispatched.workItemId),
        eq(workItems.purpose, CLAUDE_SCIENTIST_RESEARCH_TASK_WORK_ITEM_PURPOSE),
      ),
    });
    if (!workItem) {
      throw new Error("Expected dispatched Scientist work item.");
    }

    const commandTool = requireTool({ name: "run_workspace_command" });
    const command = (
      JSON.parse(
        (
          await commandTool.handler({
            input: {
              experimentId: experiment.id,
              command:
                'printf \'%s\\n%s\\n%s\\n\' "$SITU_COMPUTE_TARGET_ID" "$SITU_COMPUTE_POOL" "$CUDA_VISIBLE_DEVICES"',
            },
            context: {
              ...toolContext({ activeResearchTaskId: task.id }),
              workItem,
            },
          })
        ).content,
      ) as {
        ok: true;
        data: { command: { success: boolean; stdout: string; changedFiles: string[] } };
      }
    ).data.command;

    expect(command.success).toBe(true);
    expect(command.stdout).toBe("target-workspace-env\ngpu\n7\n");
    expect(command.changedFiles).toEqual([]);

    const target = await computeTargetRepository.require({
      computeTargetId: "target-workspace-env",
    });
    expect(target.status).toBe("claimed");
    expect(target.claimedByResearchTaskId).toBe(task.id);
  });

  test("experiment command output directories keep logs out of candidate patches", async () => {
    const experiment = await createExperiment();

    const command = await runExperimentWorkspaceCommand({
      experimentId: experiment.id,
      runtime,
      command:
        "printf 'eval log\\n' > \"$SITU_EXPERIMENT_OUTPUT_DIR/run.log\" && printf '%s' \"$SITU_EXPERIMENT_OUTPUT_DIR\"",
    });

    const outputDir = command.stdout.trim();
    expect(command.success).toBe(true);
    expect(outputDir).toContain(join(runtime.sessionHome, "command-output"));
    expect(command.changedFiles).toEqual([]);
    expect(existsSync(join(command.worktreePath, "run.log"))).toBe(false);
    await expect(readFile(join(outputDir, "run.log"), "utf8")).resolves.toBe("eval log\n");
  });

  test("read-only workspace command inspects the repo without preparing an experiment worktree", async () => {
    const commandTool = requireTool({ name: "run_readonly_workspace_command" });
    const dirtyFile = join(repoPath, "source-write.txt");

    expect(commandTool.roles).toEqual(["manager", "scientist", "verifier", "reporter", "scribe"]);

    const command = (
      JSON.parse(
        (
          await commandTool.handler({
            input: { command: "cat README.md" },
            context: toolContext(),
          })
        ).content,
      ) as {
        ok: true;
        data: {
          command: {
            success: boolean;
            stdout: string;
            workspacePath: string;
            readOnlyViolation: boolean;
            changedFiles: string[];
          };
        };
      }
    ).data.command;
    expect(command.success).toBe(true);
    expect(command.stdout).toBe("baseline\n");
    expect(command.workspacePath).toBe(repoPath);
    expect(command.readOnlyViolation).toBe(false);
    expect(command.changedFiles).toEqual([]);

    const outputWrite = (
      JSON.parse(
        (
          await commandTool.handler({
            input: {
              command:
                "printf 'source log\\n' > \"$SITU_COMMAND_OUTPUT_DIR/run.log\" && printf '%s' \"$SITU_COMMAND_OUTPUT_DIR\"",
            },
            context: toolContext(),
          })
        ).content,
      ) as {
        ok: true;
        data: {
          command: {
            success: boolean;
            stdout: string;
            readOnlyViolation: boolean;
            changedFiles: string[];
          };
        };
      }
    ).data.command;
    const outputDir = outputWrite.stdout.trim();
    expect(outputWrite.success).toBe(true);
    expect(outputWrite.readOnlyViolation).toBe(false);
    expect(outputWrite.changedFiles).toEqual([]);
    expect(existsSync(join(repoPath, "run.log"))).toBe(false);
    await expect(readFile(join(outputDir, "run.log"), "utf8")).resolves.toBe("source log\n");

    const absoluteCwd = (
      JSON.parse(
        (
          await commandTool.handler({
            input: { command: "pwd", workingDirectory: repoPath },
            context: toolContext(),
          })
        ).content,
      ) as { ok: true; data: { command: { success: boolean; stdout: string; cwd: string } } }
    ).data.command;
    expect(absoluteCwd.success).toBe(true);
    expect(absoluteCwd.cwd).toBe(repoPath);
    expect(absoluteCwd.stdout.trim()).toBe(repoPath);

    try {
      const writeAttempt = (
        JSON.parse(
          (
            await commandTool.handler({
              input: { command: "printf 'nope\\n' > source-write.txt" },
              context: toolContext(),
            })
          ).content,
        ) as {
          ok: true;
          data: {
            command: {
              commandSucceeded: boolean;
              success: boolean;
              readOnlyViolation: boolean;
              changedFiles: string[];
            };
          };
        }
      ).data.command;
      expect(writeAttempt.commandSucceeded).toBe(true);
      expect(writeAttempt.success).toBe(false);
      expect(writeAttempt.readOnlyViolation).toBe(true);
      expect(writeAttempt.changedFiles).toContain("source-write.txt");
    } finally {
      await rm(dirtyFile, { force: true });
    }

    const escape = JSON.parse(
      (
        await commandTool.handler({
          input: { command: "pwd", workingDirectory: ".." },
          context: toolContext(),
        })
      ).content,
    ) as { ok: false; code: string };
    expect(escape.ok).toBe(false);
    expect(escape.code).toBe("workspace_path_escape");
  });

  test("create_artifact records ResearchTask authorship without task foreign keys", async () => {
    const researchTask = await createResearchTask();
    const experiment = await createExperiment();
    const artifactTool = requireTool({ name: "create_artifact" });

    const schema = artifactTool.input_schema as {
      properties?: Record<string, unknown>;
    };
    expect(schema.properties?.researchTaskId).toBeUndefined();

    const created = (
      JSON.parse(
        (
          await artifactTool.handler({
            input: {
              title: "ResearchTask synthesis report",
              path: "reports/synthesis.md",
              kind: "report",
              body: "Durable synthesis report body.",
              entityKind: "experiment",
              entityId: experiment.id,
            },
            context: toolContext({ activeResearchTaskId: researchTask.id }),
          })
        ).content,
      ) as {
        ok: true;
        data: {
          artifact: { body: string; createdByResearchTaskId: string | null; entityId: string };
        };
      }
    ).data.artifact;

    expect(created.body).toBe("Durable synthesis report body.");
    expect(created.entityId).toBe(experiment.id);
    expect(created.createdByResearchTaskId).toBe(researchTask.id);
  });

  test("record_experiment_comparison creates linked evaluation and measurement records", async () => {
    const task = await createResearchTask();
    const baseline = await baselineRepository.create({
      title: "Baseline behavior",
      summary: "Baseline output was old.",
      createdByResearchTaskId: task.id,
    });
    const experiment = await createExperiment({ researchTaskId: task.id });
    const prepared = await prepareExperimentWorktree({
      experimentId: experiment.id,
      runtime,
    });
    await writeFile(join(prepared.worktreePath, "candidate.txt"), "new output\n");
    const candidate = await captureExperimentCandidate({
      experimentId: experiment.id,
      runtime,
    });
    const comparisonTool = requireTool({ name: "record_experiment_comparison" });

    const result = JSON.parse(
      (
        await comparisonTool.handler({
          input: {
            baselineId: baseline.id,
            experimentId: experiment.id,
            title: "Baseline vs candidate",
            summary: "Compare command output before and after the candidate.",
            body: "Candidate output changed from old output to new output.",
            command: "cat candidate.txt",
            baselineOutput: "old output\n",
            candidateOutput: "new output\n",
          },
          context: toolContext({ activeResearchTaskId: task.id }),
        })
      ).content,
    ) as {
      ok: true;
      data: {
        comparison: {
          evaluation: { id: string; associatedBaselineId: string; associatedExperimentId: string };
          measurement: { id: string; evaluationId: string; payloadJson: string };
        };
      };
    };
    expect(result.ok).toBe(true);
    const comparison = result.data.comparison;

    expect(comparison.evaluation.associatedBaselineId).toBe(baseline.id);
    expect(comparison.evaluation.associatedExperimentId).toBe(experiment.id);
    expect(comparison.measurement.evaluationId).toBe(comparison.evaluation.id);

    const storedEvaluation = await getDb().query.evaluations.findFirst({
      where: eq(evaluations.id, comparison.evaluation.id),
    });
    const storedMeasurement = await getDb().query.measurements.findFirst({
      where: eq(measurements.id, comparison.measurement.id),
    });
    const payload = JSON.parse(storedMeasurement?.payloadJson ?? "{}") as {
      measurementType?: string;
      baseCommit?: string;
      candidateCommit?: string | null;
    };
    expect(storedEvaluation?.associatedBaselineId).toBe(baseline.id);
    expect(payload.measurementType).toBe("baseline_candidate_comparison");
    expect(payload.baseCommit).toBe(prepared.baseCommit);
    expect(payload.candidateCommit).toBe(candidate.candidateCommit);
  });
});

async function createExperiment({
  researchTaskId,
  parentExperimentId,
}: {
  researchTaskId?: string;
  parentExperimentId?: string;
} = {}): Promise<typeof experiments.$inferSelect> {
  const hypothesis = await hypothesisRepository.create({
    title: "Candidate worktree hypothesis",
    summary: "Primary hypothesis for isolated worktree management.",
    createdByResearchTaskId: researchTaskId,
  });
  return experimentRepository.create({
    title: "Candidate worktree",
    summary: "Exercise isolated worktree management.",
    createdByResearchTaskId: researchTaskId,
    associatedHypothesisId: hypothesis.id,
    parentExperimentId,
  });
}

async function createResearchTask({
  type = "exploit",
  payload = {},
}: {
  type?: ResearchTaskRecord["type"];
  payload?: Record<string, unknown>;
} = {}): Promise<ResearchTaskRecord> {
  const project = await researchProjectRepository.create({
    goal: `Worktree test project ${crypto.randomUUID()}`,
  });
  const searchProject = await researchProjectRepository.updatePhase({
    researchProjectId: project.id,
    phase: "search",
    baselineSummary: "Confirmed setup baseline.",
  });
  return researchTaskRepository.create({
    researchProjectId: searchProject.id,
    type,
    title: "Experiment ResearchTask",
    workerPrompt: "Exercise experiment workflow.",
    verificationPrompt: "Verify experiment workflow.",
    payload,
  });
}

function requireTool({
  name,
}: {
  name: string;
}): NonNullable<ReturnType<typeof claudeAgentToolDefinitionByName>> {
  const tool = claudeAgentToolDefinitionByName({ name });
  if (!tool) {
    throw new Error(`Tool not found: ${name}`);
  }
  return tool;
}

function toolContext({
  activeResearchTaskId,
}: {
  activeResearchTaskId?: string;
} = {}): Parameters<
  NonNullable<ReturnType<typeof claudeAgentToolDefinitionByName>>["handler"]
>[0]["context"] {
  return {
    claudeAgentRunId: "run_test",
    activeResearchTaskId,
    workItem: {
      id: "work_test",
      purpose: "test",
      targetKind: "test",
      targetId: "test",
      status: "claimed",
      ownerAgentId: null,
      ownerWorkflowId: null,
      attempt: 1,
      availableAt: new Date().toISOString(),
      claimedAt: null,
      leaseExpiresAt: null,
      completedAt: null,
      payloadJson: "{}",
      syncVersion: 1,
      syncDeleted: false,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    },
  };
}

async function git({ cwd, args }: { cwd: string; args: string[] }): Promise<string> {
  const result = Bun.spawnSync({
    cmd: ["git", ...args],
    cwd,
    stdout: "pipe",
    stderr: "pipe",
  });
  const stdout = new TextDecoder().decode(result.stdout).trim();
  const stderr = new TextDecoder().decode(result.stderr).trim();
  if (result.exitCode !== 0) {
    throw new Error(stderr || `git ${args.join(" ")} failed`);
  }
  return stdout;
}
