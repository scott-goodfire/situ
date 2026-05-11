import type { EvaluationRecord } from "@situ/protocol";
import { useEntityList } from "../entity";

export function useEvaluations(): EvaluationRecord[] {
  return useEntityList<EvaluationRecord>("evaluations/");
}
