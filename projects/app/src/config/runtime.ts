import { commandLineModule } from "../modules/command-line";

export const defaultRuntimeHost = "127.0.0.1";
export const defaultRuntimePort = 5500;
export const defaultMaxScientistConcurrency = 12;
export const defaultMaxVerifierConcurrency = 32;

export type RuntimeOptions = {
  host: string;
  port: number;
  allowPortFallback: boolean;
  sessionId?: string;
};

export function parseRuntimeOptions({ argv }: { argv: string[] }): RuntimeOptions {
  const options: RuntimeOptions = {
    host: defaultRuntimeHost,
    port: defaultRuntimePort,
    allowPortFallback: true,
  };

  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];
    if (arg === "--host") {
      options.host = commandLineModule.requireValue({ argv, index, flag: arg });
      index += 1;
      continue;
    }
    if (arg === "--port") {
      options.port = commandLineModule.portNumber({
        value: commandLineModule.requireValue({ argv, index, flag: arg }),
        flag: arg,
      });
      options.allowPortFallback = false;
      index += 1;
      continue;
    }
    if (arg === "--session") {
      options.sessionId = commandLineModule.requireValue({ argv, index, flag: arg });
      index += 1;
      continue;
    }
    if (commandLineModule.isHelpFlag({ arg })) {
      printHelp();
      process.exit(0);
    }
    throw new Error(`unknown option: ${arg}`);
  }

  return options;
}

function printHelp(): void {
  console.log(
    `Usage: situ app [--host ${defaultRuntimeHost}] [--port ${defaultRuntimePort}] [--session id]`,
  );
}

export function schedulerDisabled(): boolean {
  const value = process.env.SITU_DISABLE_SCHEDULER?.trim().toLowerCase();
  return value === "1" || value === "true" || value === "yes";
}

export function devModeEnabled(): boolean {
  const value = process.env.SITU_DEV?.trim().toLowerCase();
  return value === "1" || value === "true" || value === "yes";
}

export function maxScientistConcurrency(): number {
  const value = process.env.MAX_SITU_SCIENTIST_CONCURRENCY?.trim();
  if (!value) {
    return defaultMaxScientistConcurrency;
  }
  const parsed = Number(value);
  if (!Number.isInteger(parsed) || parsed < 1) {
    return defaultMaxScientistConcurrency;
  }
  return parsed;
}

export function maxVerifierConcurrency(): number {
  const value = process.env.MAX_SITU_VERIFIER_CONCURRENCY?.trim();
  if (!value) {
    return defaultMaxVerifierConcurrency;
  }
  const parsed = Number(value);
  if (!Number.isInteger(parsed) || parsed < 1) {
    return defaultMaxVerifierConcurrency;
  }
  return parsed;
}
