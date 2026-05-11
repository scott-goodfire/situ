import { mkdir } from "node:fs/promises";
import { z } from "zod";

import { PreconditionError } from "../../../data/repositories/__shared__";
import { workItemPayload } from "../../../runtime/work-items/payload";
import { defineTool } from "./__shared__/define-tool";
import { Result } from "./__shared__/result";

const DEFAULT_TIMEOUT_MS = 60_000;
const MAX_TIMEOUT_MS = 10 * 60_000;
const DEFAULT_MAX_OUTPUT_BYTES = 64_000;
const MAX_OUTPUT_BYTES_CAP = 1024 * 1024;

const inputSchema = z.object({
  command: z
    .string()
    .describe(
      "Shell command to run in the report output directory. Use heredocs to write REPORT.md and _make_trajectory.py. Run python3 _make_trajectory.py to render trajectory.png.",
    ),
  timeoutSeconds: z.number().describe("Optional timeout in seconds.").optional(),
  maxOutputBytes: z.number().describe("Optional combined output limit in bytes.").optional(),
});

export const runReportCommandTool = defineTool({
  name: "run_report_command",
  description:
    "Run a shell command in the situ report output directory. Use this to write REPORT.md and _make_trajectory.py via heredocs, render trajectory.png with python3, and inspect intermediate output. The working directory is created automatically.",
  roles: ["reporter"],
  inputSchema,
  resultEnvelope: true,
  handler: async ({ input, context }) => {
    if (!input.command.trim()) {
      throw new PreconditionError({
        code: "report_command_required",
        hint: "Provide a non-empty command string.",
      });
    }
    const outputDir = workItemPayload({ workItem: context.workItem }).reportOutputDir;
    if (!outputDir || typeof outputDir !== "string") {
      throw new PreconditionError({
        code: "missing_report_output_dir",
        hint: "Run this tool from a report work item; reportOutputDir must be set in the work item payload.",
      });
    }
    await mkdir(outputDir, { recursive: true });

    const timeoutMs = clampNumber({
      value: (input.timeoutSeconds ?? DEFAULT_TIMEOUT_MS / 1000) * 1000,
      min: 1_000,
      max: MAX_TIMEOUT_MS,
    });
    const maxOutputBytes = clampNumber({
      value: input.maxOutputBytes ?? DEFAULT_MAX_OUTPUT_BYTES,
      min: 1_024,
      max: MAX_OUTPUT_BYTES_CAP,
    });

    const result = Bun.spawnSync({
      cmd: [process.env.SHELL ?? "/bin/bash", "-lc", input.command],
      cwd: outputDir,
      stdout: "pipe",
      stderr: "pipe",
      timeout: timeoutMs,
      killSignal: "SIGKILL",
      maxBuffer: maxOutputBytes,
    });

    return Result.ok({
      reportDir: outputDir,
      command: input.command,
      exitCode: result.exitCode,
      success: result.success,
      timedOut: result.exitedDueToTimeout ?? false,
      outputTruncated: result.exitedDueToMaxBuffer ?? false,
      stdout: new TextDecoder().decode(result.stdout),
      stderr: new TextDecoder().decode(result.stderr),
    });
  },
});

function clampNumber({ value, min, max }: { value: number; min: number; max: number }): number {
  if (!Number.isFinite(value)) {
    return min;
  }
  return Math.min(Math.max(Math.trunc(value), min), max);
}
