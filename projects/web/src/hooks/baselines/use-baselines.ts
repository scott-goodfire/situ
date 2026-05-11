import type { BaselineRecord } from "@situ/protocol";
import { useEntityList } from "../entity";

export function useBaselines(): BaselineRecord[] {
  return useEntityList<BaselineRecord>("baselines/");
}
