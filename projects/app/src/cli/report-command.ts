import { commandLineModule } from "../modules/command-line";
import { runOneShotReporter } from "../runtime/automation";
import type { Effort } from "../claude/agents/roles/models";

const VALID_EFFORTS = new Set<Effort>(["medium", "high"]);

export async function runReportCommand({ argv }: { argv: string[] }): Promise<number> {
  const parsed = commandLineModule.parseOptions({
    argv,
    commandName: "situ report",
    options: [
      { rawName: "--effort <effort>" },
      { rawName: "--output-dir <path>" },
      { rawName: "-h, --help" },
    ],
  });

  if (commandLineModule.booleanOption({ value: parsed.options.help })) {
    printReportHelp();
    return 0;
  }

  const sessionId = parsed.positionals[0];
  if (!sessionId) {
    throw new Error("situ report requires a <session-id> positional argument.");
  }
  if (parsed.positionals.length > 1) {
    throw new Error("situ report takes exactly one <session-id> positional argument.");
  }

  const effortRaw = commandLineModule.optionalStringOption({
    value: parsed.options.effort,
    flag: "--effort",
  });
  const effort: Effort = effortRaw ? parseEffort({ value: effortRaw }) : "high";

  const outputDir = commandLineModule.optionalStringOption({
    value: parsed.options.outputDir,
    flag: "--output-dir",
  });

  console.error(`[situ-report] Generating report for session ${sessionId} (effort=${effort})`);
  const summary = await runOneShotReporter({ sessionId, effort, outputDir });
  console.error(`[situ-report] Output directory: ${summary.outputDir}`);
  console.log(summary.outputDir);
  return summary.workItemStatus === "done" ? 0 : 2;
}

function parseEffort({ value }: { value: string }): Effort {
  const normalized = value.trim().toLowerCase();
  if (VALID_EFFORTS.has(normalized as Effort)) {
    return normalized as Effort;
  }
  throw new Error(`--effort must be one of ${[...VALID_EFFORTS].join(", ")}; got ${value}`);
}

function printReportHelp(): void {
  console.log(
    [
      "usage: situ report <session-id> [--effort medium|high] [--output-dir <path>]",
      "",
      "Generate a written report and a trajectory chart for a research session.",
      "Defaults: --effort high (Opus), --output-dir ~/.situ/reports/<session-id>/.",
    ].join("\n"),
  );
}
