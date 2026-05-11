import { createApp, type AppMode } from "./server";
import {
  runComputeCommand,
  runEventsCommand,
  runExecCommand,
  runInstructionsCommand,
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
  schedulerDisabled,
} from "./config/runtime";
import { ensureRuntimeContext } from "./config/session-context";
import { initObservability } from "./observability";
import { createRuntimeScheduler } from "./runtime/scheduler";
import { installShutdownHandlers } from "./runtime/shutdown";
import {
  createViteDevHandler,
  hasSpaAssets,
  missingSpaAssets,
  resolveSpaAssets,
  sourceSpaRootPath,
  type ViteDevHandler,
} from "./spa";
import { installInfo } from "./config/install-info";
import { runDoctorCommand } from "./diagnostics/doctor";
import { parseRootCommand } from "./cli/root-command";
import { serveWithPortFallback } from "./cli/server-listen";

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
          const { mode: appMode, viteHandler } = await resolveAppMode();
          const app = createApp({ mode: appMode });
          const server = serveWithPortFallback({
            hostname: serverOptions.host,
            port: serverOptions.port,
            allowPortFallback: serverOptions.allowPortFallback,
            fetch: app.fetch,
            idleTimeout: 0,
          });
          const scheduler = createRuntimeScheduler();
          if (!schedulerDisabled()) {
            scheduler.start();
          }
          const closeables = viteHandler ? [viteHandler, observability] : [observability];
          installShutdownHandlers({ server, scheduler, closeables });
          return {
            webUrl: String(server.url),
            teardown: async () => {
              await scheduler.stop();
              await server.stop(true);
              for (const closeable of closeables) {
                try {
                  await closeable.close();
                } catch {}
              }
            },
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
    resume: options.resume,
    sessionId: options.sessionId,
  });
  const { mode: appMode, viteHandler } = await resolveAppMode();
  const app = createApp({ mode: appMode });
  const server = serveWithPortFallback({
    hostname: options.host,
    port: options.port,
    allowPortFallback: options.allowPortFallback,
    fetch: app.fetch,
    idleTimeout: 0,
  });
  const scheduler = createRuntimeScheduler();
  if (!schedulerDisabled()) {
    scheduler.start();
  }
  installShutdownHandlers({
    server,
    scheduler,
    closeables: viteHandler ? [viteHandler, observability] : [observability],
  });
  console.log(`Situ running at ${server.url}`);
  console.log(`Session ${runtime.sessionId}`);
} catch (error) {
  console.error(error instanceof Error ? error.message : String(error));
  process.exit(1);
}

function printHelp(): void {
  const dev = devModeEnabled();
  const lines: string[] = [
    "Usage:",
    `  situ app [--host ${defaultRuntimeHost}] [--port ${defaultRuntimePort}] [--resume] [--session id]`,
    `  situ exec --objective "objective" [--timeout 600] [--host ${defaultRuntimeHost}] [--port ${defaultRuntimePort}] [--resume] [--session id]`,
    `  situ exec --resume [--objective "objective"] [--timeout 600] [--host ${defaultRuntimeHost}] [--port ${defaultRuntimePort}]`,
    `  situ resume <session-id> [--objective "objective"] [--timeout 600] [--host ${defaultRuntimeHost}] [--port ${defaultRuntimePort}]`,
    "  situ status [--session id] [--json]",
    "  situ sessions [--all] [--json]",
    "  situ events [--session id] [--limit 20] [--follow] [--json]",
    "  situ instructions",
    "  situ skill install|uninstall|show-path",
    "  situ compute list [--pool name] [--status status] [--json] [--session id]",
    dev
      ? "  situ compute add [--pool local] [--kind local] [--label label] [--id id] [--metadata-json json] [--cuda-visible-devices devices]"
      : "  situ compute add [--pool local] [--kind local] [--label label] [--cuda-visible-devices devices]",
    "  situ compute drain|restore|remove <target-id> [--json] [--session id]",
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

async function resolveAppMode(): Promise<{
  mode: AppMode;
  viteHandler?: ViteDevHandler;
}> {
  const spaAssets = resolveSpaAssets();
  if (spaAssets.mode === "source") {
    const viteHandler = await createViteDevHandler({ root: sourceSpaRootPath() });
    return { mode: { kind: "dev", vite: viteHandler }, viteHandler };
  }
  if (!hasSpaAssets({ root: spaAssets.root })) {
    const missing = missingSpaAssets({ root: spaAssets.root }).join(", ");
    throw new Error(`SPA assets are missing from ${spaAssets.root}: ${missing}`);
  }
  return { mode: { kind: "prod", webRoot: spaAssets.root } };
}
