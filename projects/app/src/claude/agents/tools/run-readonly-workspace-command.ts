import { z } from "zod";

import { computeEnvForWorkItem } from "../../../runtime/compute";
import { defineTool } from "./__shared__/define-tool";
import { Result } from "./__shared__/result";
import { allRoles } from "./__shared__/roles";
import { runReadonlyWorkspaceCommand } from "./__shared__/source-workspace";

const inputSchema = z.object({
  command: z.string().describe("Shell command to run inside the source workspace."),
  workingDirectory: z
    .string()
    .describe(
      "Optional directory inside the source workspace. Relative paths are preferred; absolute paths inside the workspace are accepted.",
    )
    .optional(),
  timeoutSeconds: z.number().describe("Optional timeout in seconds.").optional(),
  maxOutputBytes: z.number().describe("Optional combined output limit in bytes.").optional(),
});

export const runReadonlyWorkspaceCommandTool = defineTool({
  name: "run_readonly_workspace_command",
  description:
    "Run a shell command in the source workspace for repo inspection, baseline evidence, or verification. The command may use normal shell syntax. Write temporary logs/results to $SITU_COMMAND_OUTPUT_DIR, not the source workspace; the result reports failure if the source workspace changed.",
  roles: allRoles,
  inputSchema,
  resultEnvelope: true,
  handler: async ({ input, context }) => {
    const timeoutSeconds = input.timeoutSeconds;
    return Result.ok({
      command: await runReadonlyWorkspaceCommand({
        command: input.command,
        env: await computeEnvForWorkItem({ workItem: context.workItem }),
        workingDirectory: input.workingDirectory,
        timeoutMs: timeoutSeconds === undefined ? undefined : timeoutSeconds * 1000,
        maxOutputBytes: input.maxOutputBytes,
      }),
    });
  },
});
