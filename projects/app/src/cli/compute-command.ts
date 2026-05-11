import { CUDA_VISIBLE_DEVICES_METADATA_KEY } from "../runtime/compute";
import { commandLineModule } from "../modules/command-line";
import { printResult } from "./__shared__";
import { ensureRuntimeContext } from "../config/session-context";
import { recordAppEvent } from "../app-events";
import {
  computeTargetRepository,
  type ComputeTargetStatus,
} from "../data/repositories/compute-targets";

type CommonOptions = {
  json: boolean;
  resume: boolean;
  sessionId?: string;
};

type ComputeCommand =
  | ({ kind: "list"; pool?: string; status?: ComputeTargetStatus; limit: number } & CommonOptions)
  | ({
      kind: "add";
      computeTargetId?: string;
      pool: string;
      targetKind: string;
      label?: string;
      metadata: Record<string, unknown>;
    } & CommonOptions)
  | ({ kind: "drain"; computeTargetId: string } & CommonOptions)
  | ({ kind: "restore"; computeTargetId: string } & CommonOptions)
  | ({ kind: "remove"; computeTargetId: string; force: boolean } & CommonOptions);

const statuses = new Set<ComputeTargetStatus>(["idle", "claimed", "draining", "dead"]);

const commonComputeOptionDefinitions = [
  { rawName: "--json" },
  { rawName: "--resume" },
  { rawName: "--session <session>" },
  { rawName: "-h, --help" },
] as const;

export async function runComputeCommand({ argv }: { argv: string[] }): Promise<number> {
  const command = parseComputeCommand({ argv });
  await ensureRuntimeContext({
    resume: command.resume,
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

  if (command.kind === "add") {
    const target = await computeTargetRepository.upsert({
      computeTargetId: command.computeTargetId,
      pool: command.pool,
      kind: command.targetKind,
      label: command.label,
      metadata: command.metadata,
    });
    await recordAppEvent({
      type: "compute_target.upserted",
      message: `Compute target registered: ${target.id}`,
      payload: { computeTargetId: target.id, pool: target.pool },
    });
    printResult({
      json: command.json,
      value: { computeTarget: target },
      text: formatTarget({ target }),
    });
    return 0;
  }

  if (command.kind === "drain") {
    const target = await computeTargetRepository.drain({
      computeTargetId: command.computeTargetId,
    });
    await recordAppEvent({
      type: "compute_target.draining",
      message: `Compute target draining: ${target.id}`,
      payload: { computeTargetId: target.id, pool: target.pool },
    });
    printResult({
      json: command.json,
      value: { computeTarget: target },
      text: formatTarget({ target }),
    });
    return 0;
  }

  if (command.kind === "restore") {
    const target = await computeTargetRepository.restore({
      computeTargetId: command.computeTargetId,
    });
    await recordAppEvent({
      type: "compute_target.restored",
      message: `Compute target restored: ${target.id}`,
      payload: { computeTargetId: target.id, pool: target.pool },
    });
    printResult({
      json: command.json,
      value: { computeTarget: target },
      text: formatTarget({ target }),
    });
    return 0;
  }

  const current = await computeTargetRepository.require({
    computeTargetId: command.computeTargetId,
  });
  const claimed = current.status === "claimed" || Boolean(current.claimedByResearchTaskId);
  if (claimed && !command.force) {
    throw new Error(`Compute target is claimed; drain it first or pass --force: ${current.id}`);
  }
  const target = claimed
    ? await computeTargetRepository.drain({ computeTargetId: current.id })
    : await computeTargetRepository.remove({ computeTargetId: current.id });
  await recordAppEvent({
    type: "compute_target.removed",
    message: `Compute target removed: ${target.id}`,
    payload: {
      computeTargetId: target.id,
      pool: target.pool,
      deferredUntilLeaseRelease: target.status === "draining",
    },
  });
  printResult({
    json: command.json,
    value: { computeTarget: target },
    text: formatTarget({ target }),
  });
  return 0;
}

function parseComputeCommand({ argv }: { argv: string[] }): ComputeCommand {
  const [subcommand, ...rest] = argv;
  if (!subcommand || subcommand === "list") {
    return parseListCommand({ argv: subcommand ? rest : argv });
  }
  const parser = computeSubcommandParsers[subcommand];
  if (parser) return parser({ argv: rest });
  if (commandLineModule.isHelpFlag({ arg: subcommand })) {
    printHelp();
    process.exit(0);
  }
  throw new Error(`unknown compute command: ${subcommand}`);
}

const computeSubcommandParsers: Readonly<
  Record<string, ({ argv }: { argv: string[] }) => ComputeCommand>
> = {
  add: parseAddCommand,
  drain: ({ argv }) => parseTargetCommand({ argv, kind: "drain" }),
  remove: parseRemoveCommand,
  restore: ({ argv }) => parseTargetCommand({ argv, kind: "restore" }),
};

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
    usage: "Usage: situ compute list [--pool name] [--status status] [--json] [--session id]",
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

function parseAddCommand({ argv }: { argv: string[] }): ComputeCommand {
  const parsed = parseComputeOptions({
    argv,
    commandName: "add",
    options: [
      { rawName: "--id <id>" },
      { rawName: "--pool <pool>" },
      { rawName: "--kind <kind>" },
      { rawName: "--label <label>" },
      { rawName: "--metadata-json <json>" },
      { rawName: "--cuda-visible-devices <devices>" },
    ],
  });
  exitComputeHelp({
    parsed,
    usage:
      "Usage: situ compute add [--pool local] [--kind local] [--label label] [--id id] [--metadata-json json] [--json]",
  });
  rejectUnexpectedPositionals({ parsed });

  const metadataJson = commandLineModule.optionalStringOption({
    value: parsed.options.metadataJson,
    flag: "--metadata-json",
  });
  const cudaVisibleDevices = commandLineModule.optionalStringOption({
    value: parsed.options.cudaVisibleDevices,
    flag: "--cuda-visible-devices",
  });
  const metadata = metadataWithCudaVisibleDevices({
    metadata: metadataJson ? metadataValue({ value: metadataJson }) : {},
    cudaVisibleDevices,
  });
  return {
    kind: "add",
    computeTargetId: commandLineModule.optionalStringOption({
      value: parsed.options.id,
      flag: "--id",
    }),
    pool:
      commandLineModule.optionalStringOption({ value: parsed.options.pool, flag: "--pool" }) ??
      "local",
    targetKind:
      commandLineModule.optionalStringOption({ value: parsed.options.kind, flag: "--kind" }) ??
      "local",
    label: commandLineModule.optionalStringOption({ value: parsed.options.label, flag: "--label" }),
    metadata,
    ...commonOptions({ parsed }),
  };
}

function parseTargetCommand({
  argv,
  kind,
}: {
  argv: string[];
  kind: "drain" | "restore";
}): ComputeCommand {
  const parsed = parseComputeOptions({ argv, commandName: kind, options: [] });
  exitComputeHelp({
    parsed,
    usage: `Usage: situ compute ${kind} <target-id> [--json] [--session id]`,
  });
  if (parsed.positionals.length !== 1) {
    throw new Error(`situ compute ${kind} requires one target id`);
  }
  return { kind, computeTargetId: parsed.positionals[0], ...commonOptions({ parsed }) };
}

function parseRemoveCommand({ argv }: { argv: string[] }): ComputeCommand {
  const parsed = parseComputeOptions({
    argv,
    commandName: "remove",
    options: [{ rawName: "--force" }],
  });
  exitComputeHelp({
    parsed,
    usage: "Usage: situ compute remove <target-id> [--force] [--json] [--session id]",
  });
  if (parsed.positionals.length !== 1) {
    throw new Error("situ compute remove requires one target id");
  }
  return {
    kind: "remove",
    computeTargetId: parsed.positionals[0],
    force: commandLineModule.booleanOption({ value: parsed.options.force }),
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
  return {
    json: commandLineModule.booleanOption({ value: parsed.options.json }),
    resume: commandLineModule.booleanOption({ value: parsed.options.resume }),
    sessionId: commandLineModule.optionalStringOption({
      value: parsed.options.session,
      flag: "--session",
    }),
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

function metadataValue({ value }: { value: string }): Record<string, unknown> {
  const parsed = JSON.parse(value) as unknown;
  if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) {
    throw new Error("--metadata-json must be a JSON object");
  }
  return parsed as Record<string, unknown>;
}

function metadataWithCudaVisibleDevices({
  metadata,
  cudaVisibleDevices,
}: {
  metadata: Record<string, unknown>;
  cudaVisibleDevices?: string;
}): Record<string, unknown> {
  if (!cudaVisibleDevices) {
    return metadata;
  }
  return {
    ...metadata,
    [CUDA_VISIBLE_DEVICES_METADATA_KEY]: cudaVisibleDevices,
  };
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
  situ compute list [--pool name] [--status idle|claimed|draining|dead] [--json] [--session id]
  situ compute add [--pool local] [--kind local] [--label label] [--id id] [--metadata-json json] [--cuda-visible-devices value] [--json]
  situ compute drain <target-id> [--json] [--session id]
  situ compute restore <target-id> [--json] [--session id]
  situ compute remove <target-id> [--force] [--json] [--session id]`);
}
