import { readFile } from "node:fs/promises";

import { parseJsonRecord } from "./parse-json-record";

export async function readJsonRecordFile({
  path,
}: {
  path: string;
}): Promise<Record<string, unknown>> {
  try {
    const raw = await readFile(path, "utf8");
    return parseJsonRecord({ raw });
  } catch (error) {
    if (error instanceof Error && "code" in error && error.code === "ENOENT") {
      return {};
    }
    throw error;
  }
}
