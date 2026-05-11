import type { BaselineRecord } from "@situ/protocol";
import { useEntity } from "../entity";

export function useBaseline(id: string): BaselineRecord | undefined {
  return useEntity<BaselineRecord>("baselines/", id);
}
