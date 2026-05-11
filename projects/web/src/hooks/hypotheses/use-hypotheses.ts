import type { HypothesisRecord } from "@situ/protocol";
import { useEntityList } from "../entity";

export function useHypotheses(): HypothesisRecord[] {
  return useEntityList<HypothesisRecord>("hypotheses/");
}
