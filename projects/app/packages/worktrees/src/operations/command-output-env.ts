import { mkdir } from "node:fs/promises";
import { join } from "node:path";

import { safePathSegment } from "../__shared__/safe-path-segment";

/**
 * Create a per-label output directory under `outputRoot` and return the
 * env vars commands use to discover it. The caller is responsible for
 * choosing `outputRoot` (in situ this is the session home).
 */
export async function commandOutputEnv({
  label,
  outputRoot,
}: {
  label: string;
  outputRoot: string;
}): Promise<Record<string, string>> {
  const outputDir = join(outputRoot, "command-output", safePathSegment({ value: label }));
  await mkdir(outputDir, { recursive: true });
  return {
    SITU_COMMAND_OUTPUT_DIR: outputDir,
    SITU_RUN_OUTPUT_DIR: process.env.SITU_RUN_OUTPUT_DIR ?? outputDir,
  };
}
