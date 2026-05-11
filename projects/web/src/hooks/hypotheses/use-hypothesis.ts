import type { HypothesisRecord } from "@situ/protocol";
import { useEntity } from "../entity";

export function useHypothesis(id: string): HypothesisRecord | undefined {
  return useEntity<HypothesisRecord>("hypotheses/", id);
}
