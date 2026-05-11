import { commandLineModule } from "../modules/command-line";
import { printResult } from "./__shared__";
import { ensureRuntimeContext } from "../config/session-context";
import { computeTargetRepository, type ComputeTargetStatus } from "@situ/compute";

type CommonOptions = {
  json: boolean;
  sessionId: string;
};

type ComputeCommand = {
  kind: "list";
  pool?: string;
  status?: ComputeTargetStatus;
  limit: number;
} & CommonOptions;

const statuses = new Set<ComputeTargetStatus>(["idle", "claimed", "draining", "dead"]);

const commonComputeOptionDefinitions = [
  { rawName: "--json" },
  { rawName: "--session <session>" },
  { rawName: "-h, --help" },
] as const;

export async function runComputeCommand({ argv }: { argv: string[] }): Promise<number> {
  const command = parseComputeCommand({ argv });
  await ensureRuntimeContext({
    sessionId: command.sessionId,
  });

  if (command.kind === "list") {
    const targets = await computeTargetRepository.search({
      pool: command.pool,
      status: command.status,
      limit: command.limit,
    });
    printResult({
      json: command.json,
      value: { computeTargets: targets },
      text: formatTargets({ targets }),
    });
    return 0;
  }

  return 0;
}

function parseComputeCommand({ argv }: { argv: string[] }): ComputeCommand {
  const [subcommand, ...rest] = argv;
  if (!subcommand || subcommand === "list") {
    return parseListCommand({ argv: subcommand ? rest : argv });
  }
  if (commandLineModule.isHelpFlag({ arg: subcommand })) {
    printHelp();
    process.exit(0);
  }
  throw new Error(`unknown compute command: ${subcommand}`);
}

function parseListCommand({ argv }: { argv: string[] }): ComputeCommand {
  const parsed = parseComputeOptions({
    argv,
    commandName: "list",
    options: [
      { rawName: "--pool <pool>" },
      { rawName: "--status <status>" },
      { rawName: "--limit <limit>" },
    ],
  });
  exitComputeHelp({
    parsed,
    usage: "Usage: situ compute list --session id [--pool name] [--status status] [--json]",
  });
  rejectUnexpectedPositionals({ parsed });
  const limit = commandLineModule.optionalStringOption({
    value: parsed.options.limit,
    flag: "--limit",
  });
  const status = commandLineModule.optionalStringOption({
    value: parsed.options.status,
    flag: "--status",
  });
  return {
    kind: "list",
    pool: commandLineModule.optionalStringOption({ value: parsed.options.pool, flag: "--pool" }),
    status: status ? statusValue({ value: status }) : undefined,
    limit: limit ? commandLineModule.positiveInteger({ value: limit, flag: "--limit" }) : 50,
    ...commonOptions({ parsed }),
  };
}

function parseComputeOptions({
  argv,
  commandName,
  options,
}: {
  argv: string[];
  commandName: string;
  options: Parameters<typeof commandLineModule.parseOptions>[0]["options"];
}): ReturnType<typeof commandLineModule.parseOptions> {
  return commandLineModule.parseOptions({
    argv,
    commandName: `situ compute ${commandName}`,
    options: [...commonComputeOptionDefinitions, ...options],
  });
}

function commonOptions({
  parsed,
}: {
  parsed: ReturnType<typeof commandLineModule.parseOptions>;
}): CommonOptions {
  const sessionId = commandLineModule.optionalStringOption({
    value: parsed.options.session,
    flag: "--session",
  });
  if (!sessionId) {
    throw new Error("situ compute requires --session <session>.");
  }
  return {
    json: commandLineModule.booleanOption({ value: parsed.options.json }),
    sessionId,
  };
}

function exitComputeHelp({
  parsed,
  usage,
}: {
  parsed: ReturnType<typeof commandLineModule.parseOptions>;
  usage: string;
}): void {
  if (commandLineModule.booleanOption({ value: parsed.options.help })) {
    console.log(usage);
    process.exit(0);
  }
}

function rejectUnexpectedPositionals({
  parsed,
}: {
  parsed: ReturnType<typeof commandLineModule.parseOptions>;
}): void {
  const [positional] = parsed.positionals;
  if (positional) {
    throw new Error(`unknown option: ${positional}`);
  }
}

function statusValue({ value }: { value: string }): ComputeTargetStatus {
  if (!statuses.has(value as ComputeTargetStatus)) {
    throw new Error(`invalid compute status: ${value}`);
  }
  return value as ComputeTargetStatus;
}

function formatTargets({
  targets,
}: {
  targets: Awaited<ReturnType<typeof computeTargetRepository.search>>;
}): string {
  if (targets.length === 0) {
    return "No compute targets found.";
  }
  return targets.map((target) => formatTarget({ target })).join("\n");
}

function formatTarget({
  target,
}: {
  target: Awaited<ReturnType<typeof computeTargetRepository.require>>;
}): string {
  return [
    target.id,
    target.pool,
    target.kind,
    target.status,
    target.label ?? "",
    target.claimedByResearchTaskId ?? "",
  ].join("\t");
}

function printHelp(): void {
  console.log(`Usage:
  situ compute list --session id [--pool name] [--status idle|claimed|draining|dead] [--json]`);
}
