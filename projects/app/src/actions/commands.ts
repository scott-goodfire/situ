import { PreconditionError } from "@situ/errors";
import { runWorkspaceCommand } from "@situ/worktrees";

import { resolveActionActor } from "./actors";
import { createArtifactAction } from "./artifacts";
import { recordEvent } from "./events";
import { createMeasurementAction } from "./measurements";
import type { AppRepositories } from "./repositories";
import { targetForExperiment } from "./targets";
import type {
  Clock,
  IdFactory,
  RunExperimentCommandInput,
  RunExperimentCommandResult,
} from "./types";

export type RunExperimentCommandActionInput = {
  createId: IdFactory;
  input: RunExperimentCommandInput;
  now: Clock;
  repositories: AppRepositories;
};

const ensureAssignedActorCanRun = ({
  actorId,
  repositories,
  taskId,
}: {
  actorId: string;
  repositories: AppRepositories;
  taskId?: string;
}): void => {
  if (taskId === undefined) {
    return;
  }

  const task = repositories.tasks.require({ id: taskId });

  if (task.assignee?.actorKind !== "agent") {
    return;
  }

  if (task.assignee.actorId === actorId) {
    return;
  }

  throw new PreconditionError({
    details: {
      actorId,
      assignee: task.assignee,
      taskId,
    },
    message: "Agent must be assigned to the task before running experiment commands",
  });
};

const shouldPersistOutput = ({ output }: { output: string }): boolean => output.trim() !== "";

/**
 * Runs an experiment command and records durable product state.
 */
export const runExperimentCommandAction = async ({
  createId,
  input,
  now,
  repositories,
}: RunExperimentCommandActionInput): Promise<RunExperimentCommandResult> => {
  const actor = resolveActionActor({
    actor: input.actor,
    repositories,
  });
  const experiment = repositories.experiments.require({
    id: input.experimentId,
  });
  const taskId = input.taskId ?? experiment.taskId;

  repositories.projects.require({ id: experiment.projectId });

  if (taskId !== undefined) {
    repositories.tasks.require({ id: taskId });
  }

  if (actor.actorKind === "agent") {
    ensureAssignedActorCanRun({
      actorId: actor.actorId,
      repositories,
      taskId,
    });
  }

  recordEvent({
    createId,
    event: {
      actor,
      message: "Experiment command started",
      payload: {
        args: input.args ?? [],
        command: input.command,
        cwd: input.cwd ?? ".",
        experimentId: experiment.id,
      },
      target: targetForExperiment({ experiment }),
      type: "command.started",
    },
    now,
    repositories,
  });

  const command = await runWorkspaceCommand({
    args: input.args,
    command: input.command,
    cwd: input.cwd,
    env: input.env,
    timeoutMs: input.timeoutMs,
    workspacePath: experiment.worktreePath,
  });

  const finishedEvent = recordEvent({
    createId,
    event: {
      actor,
      message: "Experiment command finished",
      payload: {
        args: command.args,
        command: command.command,
        cwd: command.cwd,
        exitCode: command.exitCode,
        stderrLength: command.stderr.length,
        stdoutLength: command.stdout.length,
        timedOut: command.timedOut,
      },
      target: targetForExperiment({ experiment }),
      type: "command.finished",
    },
    now,
    repositories,
  });
  const artifactIds: string[] = [];

  if (shouldPersistOutput({ output: command.stdout })) {
    const artifact = createArtifactAction({
      createId,
      input: {
        actor,
        experimentId: experiment.id,
        mediaType: "text/plain",
        projectId: experiment.projectId,
        sourceCommit: experiment.currentCandidateCommit,
        summaryMarkdown: `stdout from ${command.command}`,
        target: targetForExperiment({ experiment }),
        taskId,
        title: "Command stdout",
        type: "log",
        uri: `artifact://commands/${finishedEvent.id}/stdout.txt`,
      },
      now,
      repositories,
    });

    artifactIds.push(artifact.id);
  }

  if (shouldPersistOutput({ output: command.stderr })) {
    const artifact = createArtifactAction({
      createId,
      input: {
        actor,
        experimentId: experiment.id,
        mediaType: "text/plain",
        projectId: experiment.projectId,
        sourceCommit: experiment.currentCandidateCommit,
        summaryMarkdown: `stderr from ${command.command}`,
        target: targetForExperiment({ experiment }),
        taskId,
        title: "Command stderr",
        type: "log",
        uri: `artifact://commands/${finishedEvent.id}/stderr.txt`,
      },
      now,
      repositories,
    });

    artifactIds.push(artifact.id);
  }

  const measurementIds = (input.measurements ?? []).map(
    (measurement) =>
      createMeasurementAction({
        createId,
        input: {
          actor,
          name: measurement.name,
          observedCommit: experiment.currentCandidateCommit,
          projectId: experiment.projectId,
          summaryMarkdown: measurement.summaryMarkdown,
          target: targetForExperiment({ experiment }),
          unit: measurement.unit,
          value: measurement.value,
        },
        now,
        repositories,
      }).id,
  );

  return {
    artifactIds,
    command,
    measurementIds,
  };
};
