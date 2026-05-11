import { jsonModule } from "../../modules/json";
import type { ComputeTargetRecord } from "./types";

export function targetMetadata({
  target,
}: {
  target: ComputeTargetRecord;
}): Record<string, unknown> {
  return jsonModule.parseRecord({ raw: target.metadataJson });
}
