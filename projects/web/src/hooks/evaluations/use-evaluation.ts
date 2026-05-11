import type { EvaluationRecord } from "@situ/protocol";
import { useEntity } from "../entity";

export function useEvaluation(id: string): EvaluationRecord | undefined {
  return useEntity<EvaluationRecord>("evaluations/", id);
}
