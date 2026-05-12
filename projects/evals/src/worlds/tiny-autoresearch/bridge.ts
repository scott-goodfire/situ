import { jsonModule } from "../../modules/json";
import { runBridgeCommand, type LiveExecOutput } from "../__shared__";
import type { TinyAutoresearchLiveAgentEvalCase } from "./live-agent-eval-case";

const RUNNER_ENTRY = new URL("./runner.ts", import.meta.url);

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
