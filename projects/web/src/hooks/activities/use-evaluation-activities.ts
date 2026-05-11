import type { ActivityRecord } from "@situ/protocol";
import { useActivitiesFor } from "./use-activities-for";

export function useEvaluationActivities(evaluationId: string): ActivityRecord[] {
  return useActivitiesFor("evaluationActivities/", "evaluationId", evaluationId);
}
