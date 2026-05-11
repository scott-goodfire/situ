import type { ActivityRecord } from "@situ/protocol";
import { useActivitiesFor } from "./use-activities-for";

export function useBaselineActivities(baselineId: string): ActivityRecord[] {
  return useActivitiesFor("baselineActivities/", "baselineId", baselineId);
}
