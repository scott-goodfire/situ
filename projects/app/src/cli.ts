// Must be first — strips `--effort`/`-e` from argv and sets SITU_EFFORT
// before any other module captures the env at load-time.
// eslint-disable-next-line import/no-unassigned-import
import "./cli/effort-bootstrap";
import {
  runComputeCommand,
  runEventsCommand,
  runExecCommand,
  runInstructionsCommand,
  runReportCommand,
  runSelfUpdateCommand,
  runSessionsCommand,
  runSkillCommand,
  runSkillsCommand,
  runStatusCommand,
} from "./cli/index";
import {
  defaultRuntimeHost,
  defaultRuntimePort,
  devModeEnabled,
  parseRuntimeOptions,
} from "./config/runtime";
import { ensureRuntimeContext } from "./config/session-context";
import { initObservability } from "./observability";
import { installInfo } from "./config/install-info";
import { runDoctorCommand } from "./diagnostics/doctor";
import { parseRootCommand } from "./cli/root-command";
import { startRuntimeApp } from "./cli/runtime-app";

try {
  const observability = initObservability();
  const command = parseRootCommand({ argv: Bun.argv.slice(2) });
  if (command.kind === "help") {
    printHelp();
    process.exit(0);
  }
  if (command.kind === "version") {
    const info = installInfo();
    const suffix = info.gitSha ? ` ${info.gitSha.slice(0, 8)}` : "";
    console.log(`situ ${info.version}${suffix}`);
    process.exit(0);
  }
  if (command.kind === "doctor") {
    process.exit(await runDoctorCommand({ argv: command.argv }));
  }
  if (command.kind === "exec") {
    process.exit(
      await runExecCommand({
        argv: command.argv,
        beforeAutomation: async ({ server: serverOptions }) => {
          const runtimeApp = await startRuntimeApp({
            server: serverOptions,
            closeables: [observability],
          });
          return {
            webUrl: runtimeApp.webUrl,
            teardown: runtimeApp.stop,
          };
        },
      }),
    );
  }
  if (command.kind === "compute") {
    process.exit(await runComputeCommand({ argv: command.argv }));
  }
  if (command.kind === "sessions") {
    process.exit(await runSessionsCommand({ argv: command.argv }));
  }
  if (command.kind === "status") {
    process.exit(await runStatusCommand({ argv: command.argv }));
  }
  if (command.kind === "events") {
    process.exit(await runEventsCommand({ argv: command.argv }));
  }
  if (command.kind === "instructions") {
    process.exit(await runInstructionsCommand({ argv: command.argv }));
  }
  if (command.kind === "report") {
    process.exit(await runReportCommand({ argv: command.argv }));
  }
  if (command.kind === "self-update") {
    process.exit(await runSelfUpdateCommand({ argv: command.argv }));
  }
  if (command.kind === "skill") {
    process.exit(await runSkillCommand({ argv: command.argv }));
  }
  if (command.kind === "skills") {
    process.exit(await runSkillsCommand({ argv: command.argv }));
  }

  const options = parseRuntimeOptions({ argv: command.argv });
  const runtime = await ensureRuntimeContext({
    sessionId: options.sessionId,
  });
  const runtimeApp = await startRuntimeApp({
    server: options,
    closeables: [observability],
  });
  console.log(`situ running at ${runtimeApp.webUrl}`);
  console.log(`Session ${runtime.sessionId}`);
} catch (error) {
  console.error(error instanceof Error ? error.message : String(error));
  process.exit(1);
}

function printHelp(): void {
  const dev = devModeEnabled();
  const lines: string[] = [
    "Usage:",
    `  situ app [--host ${defaultRuntimeHost}] [--port ${defaultRuntimePort}] [--session id] [--effort medium|high]`,
    `  situ exec --objective "objective" [--timeout 600] [--host ${defaultRuntimeHost}] [--port ${defaultRuntimePort}] [--session id] [--compute-pool local] [--compute-kind local] [--compute-label label] [--cuda-visible-devices devices] [--effort medium|high]`,
    `  situ exec --session id [--objective "objective"] [--timeout 600] [--host ${defaultRuntimeHost}] [--port ${defaultRuntimePort}] [--effort medium|high]`,
    "  situ status [--session id] [--json]",
    "  situ sessions [--all] [--json]",
    "  situ events [--session id] [--limit 20] [--follow] [--json]",
    "  situ instructions",
    "  situ report <session-id> [--effort medium|high] [--output-dir path]",
    "  situ skill install|uninstall|show-path",
    dev
      ? "  situ self-update [version] [--repo owner/name] [--install-home path] [--bin-dir path] [--tarball path] [--json]"
      : "  situ self-update [version] [--json]",
    "  situ doctor [--json]",
    "  situ version",
    "  situ --version",
  ];
  if (dev) {
    lines.push(
      "",
      "Dev-only (SITU_DEV=1):",
      "  situ skills sync [--json]",
      "  situ self update [version]",
    );
  }
  console.log(lines.join("\n"));
}
