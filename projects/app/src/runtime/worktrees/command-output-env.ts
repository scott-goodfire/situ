import { mkdir } from "node:fs/promises";
import { join } from "node:path";

import { safePathSegment } from "./path-utils";
import type { WorktreeRuntimeContext } from "./types";

export async function commandOutputEnv({
  label,
  runtime,
}: {
  label: string;
  runtime: Pick<WorktreeRuntimeContext, "sessionHome">;
}): Promise<Record<string, string>> {
  const outputDir = join(runtime.sessionHome, "command-output", safePathSegment({ value: label }));
  await mkdir(outputDir, { recursive: true });
  return {
    SITU_COMMAND_OUTPUT_DIR: outputDir,
    SITU_RUN_OUTPUT_DIR: process.env.SITU_RUN_OUTPUT_DIR ?? outputDir,
  };
}
