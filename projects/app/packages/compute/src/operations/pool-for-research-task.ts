import { DEFAULT_LOCAL_COMPUTE_POOL } from "../constants";
import type { ResearchTaskLike } from "../types";
import { coerceRecord, parseRecord } from "../__shared__";

export function poolForResearchTask({
  researchTask,
}: {
  researchTask: Pick<ResearchTaskLike, "payloadJson" | "type">;
}): string | undefined {
  if (researchTask.type === "verify") {
    return undefined;
  }
  const payload = parseRecord({ raw: researchTask.payloadJson });
  const compute = coerceRecord({ value: payload.compute });
  const pool = compute.pool;
  return typeof pool === "string" && pool.trim() ? pool.trim() : DEFAULT_LOCAL_COMPUTE_POOL;
}
