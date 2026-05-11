import type { TinyAutoresearchSeedName } from "@situ/evals-fixtures/tiny-autoresearch";

import { jsonModule } from "../../modules/json";
import { runBridgeCommand, type LiveExecOutput, type WorldStateOutput } from "../__shared__";
import type { TinyAutoresearchLiveAgentEvalCase } from "./live-agent-eval-case";

const RUNNER_ENTRY = new URL("./runner.ts", import.meta.url);

export async function runWorldStateBridge({
  seedName,
}: {
  seedName: TinyAutoresearchSeedName;
}): Promise<WorldStateOutput> {
  return runBridgeCommand<WorldStateOutput>({
    runnerEntryUrl: RUNNER_ENTRY,
    args: ["state", seedName],
    timeoutMs: 90_000,
  });
}

export async function runLiveExecBridge({
  evalCase,
  timeoutSeconds,
  isWatchEnabled = false,
  isKeepWorldEnabled = false,
}: {
  evalCase: TinyAutoresearchLiveAgentEvalCase;
  timeoutSeconds: number;
  isWatchEnabled?: boolean;
  isKeepWorldEnabled?: boolean;
}): Promise<LiveExecOutput> {
  return runBridgeCommand<LiveExecOutput>({
    runnerEntryUrl: RUNNER_ENTRY,
    args: [
      "live",
      jsonModule.stringify({
        value: {
          caseName: evalCase.name,
          seedName: evalCase.seedName,
          exec: evalCase.exec,
          timeoutSeconds,
          isWatchEnabled,
          isKeepWorldEnabled,
        },
      }),
    ],
    timeoutMs: (timeoutSeconds + 60) * 1000,
    streamStderr: isWatchEnabled,
  });
}
