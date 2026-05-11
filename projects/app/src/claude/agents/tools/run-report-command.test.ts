import { readFile, mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterAll, beforeAll, describe, expect, test } from "bun:test";

import type { ClaudeAgentToolContext } from "./types";
import { runReportCommandTool } from "./run-report-command";

let tempRoot: string;

describe("run_report_command tool", () => {
  beforeAll(async () => {
    tempRoot = await mkdtemp(join(tmpdir(), "situ-run-report-command-tool-"));
  });

  afterAll(async () => {
    await rm(tempRoot, { recursive: true, force: true });
  });

  test("runs a shell command in the report output directory and returns stdout", async () => {
    const outputDir = join(tempRoot, "happy-path");
    const result = await runReportCommandTool.handler({
      input: {
        command: "echo hello > out.txt && cat out.txt",
      },
      context: toolContext({ reportOutputDir: outputDir }),
    });

    const envelope = JSON.parse(result.content) as {
      ok: boolean;
      data?: {
        reportDir?: string;
        exitCode?: number;
        success?: boolean;
        stdout?: string;
        stderr?: string;
      };
    };
    expect(envelope.ok).toBe(true);
    expect(envelope.data?.exitCode).toBe(0);
    expect(envelope.data?.success).toBe(true);
    expect(envelope.data?.stdout?.trim()).toBe("hello");
    expect(envelope.data?.reportDir).toBe(outputDir);

    const written = await readFile(join(outputDir, "out.txt"), "utf8");
    expect(written.trim()).toBe("hello");
  });

  test("surfaces a non-zero exit code without throwing", async () => {
    const outputDir = join(tempRoot, "fail-path");
    const result = await runReportCommandTool.handler({
      input: { command: "false" },
      context: toolContext({ reportOutputDir: outputDir }),
    });

    const envelope = JSON.parse(result.content) as {
      ok: boolean;
      data?: { exitCode?: number; success?: boolean };
    };
    expect(envelope.ok).toBe(true);
    expect(envelope.data?.exitCode).not.toBe(0);
    expect(envelope.data?.success).toBe(false);
  });

  test("rejects when the work item payload has no reportOutputDir", async () => {
    const result = await runReportCommandTool.handler({
      input: { command: "true" },
      context: toolContext({ reportOutputDir: undefined }),
    });

    const envelope = JSON.parse(result.content) as { ok: boolean; code?: string };
    expect(envelope.ok).toBe(false);
    expect(envelope.code).toBe("missing_report_output_dir");
  });

  test("rejects an empty command string", async () => {
    const result = await runReportCommandTool.handler({
      input: { command: "   " },
      context: toolContext({ reportOutputDir: join(tempRoot, "empty-cmd") }),
    });

    const envelope = JSON.parse(result.content) as { ok: boolean; code?: string };
    expect(envelope.ok).toBe(false);
    expect(envelope.code).toBe("report_command_required");
  });
});

function toolContext({
  reportOutputDir,
}: {
  reportOutputDir: string | undefined;
}): ClaudeAgentToolContext {
  const now = "2026-05-11T00:00:00.000Z";
  const payload: Record<string, unknown> = {};
  if (reportOutputDir) {
    payload.reportOutputDir = reportOutputDir;
  }
  return {
    claudeAgentRunId: "run_report_command_tool",
    workItem: {
      id: "work_report_command_tool",
      purpose: "claude.reporter_session",
      targetKind: "researchProject",
      targetId: "rp_report_command_tool",
      status: "claimed",
      ownerAgentId: null,
      ownerWorkflowId: null,
      attempt: 1,
      availableAt: now,
      claimedAt: now,
      leaseExpiresAt: null,
      completedAt: null,
      payloadJson: JSON.stringify(payload),
      syncVersion: 1,
      syncDeleted: false,
      createdAt: now,
      updatedAt: now,
    },
  };
}
