import { z } from "zod";

import { computeEnvForWorkItem } from "../../../runtime/compute";
import { runExperimentWorkspaceCommand } from "../../../runtime/worktrees";
import { defineTool } from "./__shared__/define-tool";

const inputSchema = z.object({
  command: z.string().describe("Shell command to run inside the experiment worktree."),
  experimentId: z.string().describe("Experiment id whose worktree should be used."),
  workingDirectory: z
    .string()
    .describe(
      "Optional directory inside the experiment worktree. Relative paths are preferred; absolute paths inside the worktree are accepted.",
    )
    .optional(),
  timeoutSeconds: z.number().describe("Optional timeout in seconds.").optional(),
  maxOutputBytes: z.number().describe("Optional combined output limit in bytes.").optional(),
});

export const runWorkspaceCommandTool = defineTool({
  name: "run_workspace_command",
  description:
    "Run a shell command inside an experiment worktree for a Scientist exploit or debug task. The experiment worktree is prepared automatically from the experiment id when needed. Write temporary logs/results to $SITU_EXPERIMENT_OUTPUT_DIR or $SITU_COMMAND_OUTPUT_DIR, not the worktree root.",
  roles: ["scientist"],
  inputSchema,
  handler: async ({ input, context }) => {
    const timeoutSeconds = input.timeoutSeconds;
    return {
      command: await runExperimentWorkspaceCommand({
        experimentId: input.experimentId,
        command: input.command,
        env: await computeEnvForWorkItem({ workItem: context.workItem }),
        workingDirectory: input.workingDirectory,
        timeoutMs: timeoutSeconds === undefined ? undefined : timeoutSeconds * 1000,
        maxOutputBytes: input.maxOutputBytes,
      }),
    };
  },
});
