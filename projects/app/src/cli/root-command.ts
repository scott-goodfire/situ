import { cac } from "cac";
import { commandLineModule } from "../modules/command-line";

export type CliCommand =
  | { kind: "app"; argv: string[] }
  | { kind: "compute"; argv: string[] }
  | { kind: "doctor"; argv: string[] }
  | { kind: "events"; argv: string[] }
  | { kind: "exec"; argv: string[] }
  | { kind: "help" }
  | { kind: "instructions"; argv: string[] }
  | { kind: "sessions"; argv: string[] }
  | { kind: "self-update"; argv: string[] }
  | { kind: "skill"; argv: string[] }
  | { kind: "skills"; argv: string[] }
  | { kind: "status"; argv: string[] }
  | { kind: "version" };

type RootCommandKind = Exclude<CliCommand["kind"], "help" | "version">;

export const rootCommandKinds = [
  "app",
  "doctor",
  "exec",
  "compute",
  "sessions",
  "status",
  "events",
  "instructions",
  "self-update",
  "skill",
  "skills",
] as const satisfies readonly RootCommandKind[];

const versionArgs = new Set(["version", "--version", "-v"]);

export function parseRootCommand({ argv }: { argv: string[] }): CliCommand {
  const [first] = argv;
  if (!first) {
    return { kind: "app", argv };
  }
  const special = specialRootCommand({ argv });
  if (special) {
    return special;
  }
  const kind = matchedRootCommandKind({ argv });
  if (kind) {
    return { kind, argv: argv.slice(1) };
  }
  throw new Error(`unknown command: ${first}`);
}

function specialRootCommand({ argv }: { argv: string[] }): CliCommand | undefined {
  return (
    versionCommand({ argv }) ??
    helpCommand({ argv }) ??
    appFlagCommand({ argv }) ??
    resumeCommand({ argv }) ??
    selfUpdateAliasCommand({ argv })
  );
}

function versionCommand({ argv }: { argv: string[] }): CliCommand | undefined {
  return versionArgs.has(argv[0] ?? "") ? { kind: "version" } : undefined;
}

function helpCommand({ argv }: { argv: string[] }): CliCommand | undefined {
  const first = argv[0] ?? "";
  return commandLineModule.isHelpFlag({ arg: first }) || first === "help"
    ? { kind: "help" }
    : undefined;
}

function appFlagCommand({ argv }: { argv: string[] }): CliCommand | undefined {
  return argv[0]?.startsWith("-") ? { kind: "app", argv } : undefined;
}

function resumeCommand({ argv }: { argv: string[] }): CliCommand | undefined {
  return argv[0] === "resume"
    ? { kind: "exec", argv: resumeArgs({ argv: argv.slice(1) }) }
    : undefined;
}

function selfUpdateAliasCommand({ argv }: { argv: string[] }): CliCommand | undefined {
  return argv[0] === "self" && argv[1] === "update"
    ? { kind: "self-update", argv: argv.slice(2) }
    : undefined;
}

function matchedRootCommandKind({ argv }: { argv: string[] }): RootCommandKind | undefined {
  const cli = cac("situ");
  for (const kind of rootCommandKinds) {
    cli.command(`${kind} [...argv]`).allowUnknownOptions();
  }
  cli.parse(["bun", "situ", ...argv], { run: false });
  return rootCommandKinds.find((kind) => kind === cli.matchedCommandName);
}

function resumeArgs({ argv }: { argv: string[] }): string[] {
  const [sessionId, ...rest] = argv;
  if (!sessionId || sessionId.startsWith("-")) {
    throw new Error("situ resume requires a session id");
  }
  return ["--resume", "--session", sessionId, ...rest];
}
