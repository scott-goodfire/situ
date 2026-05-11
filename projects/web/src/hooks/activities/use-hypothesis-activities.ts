import type { ActivityRecord } from "@situ/protocol";
import { useActivitiesFor } from "./use-activities-for";

export function useHypothesisActivities(hypothesisId: string): ActivityRecord[] {
  return useActivitiesFor("hypothesisActivities/", "hypothesisId", hypothesisId);
}
