import { createServer } from "./server";
import { createAppRepositories } from "./actions";
import { createDatabase } from "./db";
import { generateProjectReport } from "./reports";

const DEFAULT_PORT = 7378;
const VERSION = process.env.SITU_BUILD_VERSION ?? "0.0.0";

export type CliCommandResult = {
  code: number;
  message?: string;
};

export const createDoctorResult = () => ({
  ok: true,
  version: VERSION,
  runtime: "bun",
});

export const runCli = async (argv: string[] = process.argv.slice(2)): Promise<CliCommandResult> => {
  const [command, subcommand, ...rest] = argv;

  if (command === undefined || command === "--help" || command === "-h") {
    return {
      code: 0,
      message: [
        "situ",
        "",
        "Commands:",
        "  app              Run the local HTTP server",
        "  doctor [--json]  Check the local installation",
        "  --version        Print the CLI version",
      ].join("\n"),
    };
  }

  if (command === "--version" || command === "version") {
    return { code: 0, message: VERSION };
  }

  if (command === "doctor") {
    const result = createDoctorResult();
    return {
      code: 0,
      message: rest.includes("--json") || subcommand === "--json" ? JSON.stringify(result) : "ok",
    };
  }

  if (command === "db") {
    return { code: 0, message: `no migrations to ${subcommand ?? "run"} yet` };
  }

  if (command === "self-update") {
    return { code: 0, message: `self-update is not implemented in ${VERSION}` };
  }

  if (command === "app" || command === "serve") {
    const port = Number(process.env.SITU_PORT ?? DEFAULT_PORT);
    const app = createServer();
    Bun.serve({ fetch: app.fetch, port });
    return { code: 0, message: `situ listening on http://localhost:${port}` };
  }

  if (command === "report") {
    const projectId = subcommand;

    if (projectId === undefined) {
      return { code: 1, message: "usage: situ report <project_id>" };
    }

    return {
      code: 0,
      message: generateProjectReport({
        projectId,
        repositories: createAppRepositories({
          db: createDatabase(),
        }),
      }),
    };
  }

  if (command === "events") {
    const repositories = createAppRepositories({
      db: createDatabase(),
    });
    const targetId = subcommand;

    if (targetId === undefined) {
      return { code: 1, message: "usage: situ events <target_id>" };
    }

    return {
      code: 0,
      message: JSON.stringify(repositories.events.listByTarget({ targetId }), undefined, 2),
    };
  }

  if (command === "exec" || command === "status" || command === "sessions") {
    return { code: 0, message: `${command} is not implemented yet` };
  }

  return { code: 1, message: `unknown command: ${command}` };
};

if (import.meta.main) {
  const result = await runCli();
  if (result.message !== undefined) {
    console.log(result.message);
  }
  if (result.code !== 0) {
    process.exit(result.code);
  }
}
