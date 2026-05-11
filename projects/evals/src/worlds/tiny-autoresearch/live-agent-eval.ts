import { cac } from "cac";
import { durableStateScorer } from "../../scorers/durable-state-scorer";
import { jsonModule } from "../../modules/json";
import { runLiveExecBridge } from "./bridge";
import {
  allLiveAgentEvalCaseName,
  defaultLiveAgentEvalCaseName,
  defaultLiveAgentEvalTimeoutSeconds,
  getTinyAutoresearchLiveAgentEvalCase,
  tinyAutoresearchLiveAgentEvalCaseNames,
  tinyAutoresearchLiveAgentEvalCases,
  type TinyAutoresearchLiveAgentEvalCase,
} from "./live-agent-eval-case";

type LiveAgentEvalOptions = Readonly<{
  caseNames: string[];
  timeoutSeconds?: number;
  isWatchEnabled: boolean;
  isKeepWorldEnabled: boolean;
  isJsonOutputEnabled: boolean;
  isListEnabled: boolean;
}>;

type LiveAgentEvalResult = Readonly<{
  name: string;
  displayName: string;
  passed: boolean;
  score: number;
  metadata: Record<string, unknown>;
  command: unknown;
}>;

class HelpRequestedError extends Error {}

try {
  const options = parseOptions({ args: Bun.argv.slice(2) });
  if (options.isListEnabled) {
    printCaseList();
    process.exit(0);
  }

  const evalCases = selectedCases({ caseNames: options.caseNames });
  const results: LiveAgentEvalResult[] = [];
  for (const evalCase of evalCases) {
    const timeoutSeconds =
      options.timeoutSeconds ?? evalCase.timeoutSeconds ?? defaultLiveAgentEvalTimeoutSeconds;
    const output = await runLiveExecBridge({
      evalCase,
      timeoutSeconds,
      isWatchEnabled: options.isWatchEnabled,
      isKeepWorldEnabled: options.isKeepWorldEnabled,
    });
    const score = durableStateScorer.scorer({
      output: { state: output.state },
      expected: evalCase.expected,
    });
    const passed = score.score === 1;
    const result = {
      name: evalCase.name,
      displayName: evalCase.displayName,
      passed,
      score: score.score,
      metadata: score.metadata,
      command: output.command,
    };
    results.push(result);

    if (!options.isJsonOutputEnabled) {
      console.log(`${evalCase.displayName}: ${passed ? "passed" : "failed"}`);
      console.log(`score: ${score.score}`);
      if (!passed) {
        console.log(jsonModule.stringify({ value: score.metadata, space: 2 }));
      }
    }
  }

  if (options.isJsonOutputEnabled) {
    console.log(jsonModule.stringify({ value: results, space: 2 }));
  }

  process.exit(results.every((result) => result.passed) ? 0 : 1);
} catch (error) {
  if (error instanceof HelpRequestedError) {
    printUsage();
    process.exit(0);
  }
  if (error instanceof Error) {
    console.error(error.message);
    console.error(error.stack ?? "");
  } else {
    console.error(String(error));
  }
  process.exit(1);
}

function parseOptions({ args }: { args: string[] }): LiveAgentEvalOptions {
  const parsed = parseLiveAgentEvalArgv({ args });
  if (booleanOption({ value: parsed.options.help })) {
    throw new HelpRequestedError();
  }
  if (parsed.positionals.length > 0) {
    throw new Error(`Unknown live agent eval option: ${parsed.positionals[0]}`);
  }

  const timeout = optionalStringOption({
    value: parsed.options.timeout ?? parsed.options.timeoutSeconds,
    label: "--timeout",
  });
  return {
    caseNames: caseNamesOrDefault({ value: parsed.options.case }),
    timeoutSeconds: timeout ? positiveInteger({ value: timeout, label: "--timeout" }) : undefined,
    isWatchEnabled: booleanOption({ value: parsed.options.watch }),
    isKeepWorldEnabled: booleanOption({ value: parsed.options.keepWorld }),
    isJsonOutputEnabled: booleanOption({ value: parsed.options.json }),
    isListEnabled: booleanOption({ value: parsed.options.list }),
  };
}

type ParsedLiveAgentEvalArgv = Readonly<{
  options: Readonly<Record<string, unknown>>;
  positionals: readonly string[];
}>;

function parseLiveAgentEvalArgv({ args }: { args: string[] }): ParsedLiveAgentEvalArgv {
  let parsed: ParsedLiveAgentEvalArgv | undefined;
  const cli = cac("tiny-autoresearch-live-agent-eval");
  cli
    .command("[...positionals]")
    .option("-h, --help", "Show help")
    .option("--watch", "Stream bridge output")
    .option("--keep-world", "Keep the world workspace")
    .option("--json", "Print JSON")
    .option("--list", "List cases")
    .option("--case <case>", "Case name")
    .option("--timeout <seconds>", "Timeout")
    .option("--timeout-seconds <seconds>", "Timeout")
    .action((positionals: string[], options: Record<string, unknown>) => {
      parsed = { options, positionals };
    });
  cli.parse(["bun", "tiny-autoresearch-live-agent-eval", ...args]);
  if (!parsed) {
    throw new Error("failed to parse live agent eval options");
  }
  return parsed;
}

function selectedCases({
  caseNames,
}: {
  caseNames: string[];
}): TinyAutoresearchLiveAgentEvalCase[] {
  if (caseNames.includes(allLiveAgentEvalCaseName)) {
    return [...tinyAutoresearchLiveAgentEvalCases];
  }
  return caseNames.map((name) => getTinyAutoresearchLiveAgentEvalCase({ name }));
}

function parseCaseNames({ value }: { value: string | undefined }): string[] {
  if (!value?.trim()) {
    throw new Error("--case requires a case name.");
  }
  return value
    .split(",")
    .map((entry) => entry.trim())
    .filter(Boolean);
}

function caseNamesOrDefault({ value }: { value: unknown }): string[] {
  const caseName = optionalStringOption({ value, label: "--case" });
  return caseName ? parseCaseNames({ value: caseName }) : [defaultLiveAgentEvalCaseName];
}

function positiveInteger({ value, label }: { value: string; label: string }): number {
  const parsed = Number(value);
  if (!Number.isInteger(parsed) || parsed <= 0) {
    throw new Error(`${label} must be a positive integer`);
  }
  return parsed;
}

function optionalStringOption({
  value,
  label,
}: {
  value: unknown;
  label: string;
}): string | undefined {
  if (value === undefined) {
    return undefined;
  }
  if (Array.isArray(value)) {
    return optionalStringOption({ value: value.at(-1), label });
  }
  if (typeof value === "string" || typeof value === "number") {
    const stringValue = String(value);
    if (stringValue) {
      return stringValue;
    }
  }
  throw new Error(`${label} requires a value.`);
}

function booleanOption({ value }: { value: unknown }): boolean {
  if (Array.isArray(value)) {
    return value.some((entry) => entry === true);
  }
  return value === true;
}

function printCaseList(): void {
  for (const evalCase of tinyAutoresearchLiveAgentEvalCases) {
    console.log(`${evalCase.name}: ${evalCase.displayName}`);
  }
}

function printUsage(): void {
  console.log(`Usage: bun run src/worlds/tiny-autoresearch/live-agent-eval.ts [options]

Options:
  --case <name>                Eval case to run. Use --case all for the suite. Default: ${defaultLiveAgentEvalCaseName}
  --list                       List available eval cases
  --timeout-seconds <seconds>  Inner live-agent budget. Default: ${defaultLiveAgentEvalTimeoutSeconds}
  --watch                      Print temporary world metadata and keep the world
  --keep-world                 Keep the temporary world without printing watch events
  --json                       Print JSON output
  -h, --help                   Show this help

Cases:
  ${[...tinyAutoresearchLiveAgentEvalCaseNames, allLiveAgentEvalCaseName].join("\n  ")}
`);
}
