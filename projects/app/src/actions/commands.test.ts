import { expect, test } from "bun:test";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

import { createInMemoryDatabase } from "../db";
import { createAppActions, createAppRepositories } from ".";

test("experiment commands create events, artifacts, and parsed measurements", async () => {
  const db = createInMemoryDatabase();
  const actions = createAppActions({ db });
  const repositories = createAppRepositories({ db });
  const workspacePath = mkdtempSync(join(tmpdir(), "situ-command-"));

  try {
    actions.createAgent({
      id: "scientist_1",
      instructionsMarkdown: "Develop candidate experiments.",
      name: "Scientist",
      role: "scientist",
    });
    const project = actions.createProject({
      goalMarkdown: "Find a better local search strategy.",
    });
    const task = actions.createTask({
      assignee: {
        actorKind: "agent",
        actorId: "scientist_1",
      },
      bodyMarkdown: "Run a candidate command.",
      projectId: project.id,
      status: "in_progress",
      title: "Run experiment",
      type: "implementation",
    });
    const experiment = actions.createExperiment({
      actor: {
        actorKind: "agent",
        actorId: "scientist_1",
      },
      baseCommit: "abc111",
      currentCandidateCommit: "def222",
      projectId: project.id,
      summaryMarkdown: "Candidate branch.",
      taskId: task.id,
      title: "Candidate",
      worktreePath: workspacePath,
    });

    const result = await actions.runExperimentCommand({
      actor: {
        actorKind: "agent",
        actorId: "scientist_1",
      },
      args: ["-c", "printf command-output"],
      command: "sh",
      experimentId: experiment.id,
      measurements: [
        {
          name: "score",
          summaryMarkdown: "Parsed score from command output.",
          value: {
            score: 0.9,
          },
        },
      ],
      taskId: task.id,
    });
    const events = repositories.events.listByTarget({ targetId: experiment.id });

    expect(result.command.stdout).toBe("command-output");
    expect(result.artifactIds).toHaveLength(1);
    expect(result.measurementIds).toHaveLength(1);
    expect(events.map((event) => event.type)).toEqual(
      expect.arrayContaining(["command.started", "command.finished"]),
    );
  } finally {
    rmSync(workspacePath, {
      force: true,
      recursive: true,
    });
  }
});
