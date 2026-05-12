import { parseRecord } from "@situ/common";
import type { ComputeTargetRecord } from "../types";

export function targetMetadata({
  target,
}: {
  target: ComputeTargetRecord;
}): Record<string, unknown> {
  return parseRecord({ raw: target.metadataJson });
}
