import type { ActivityRecord } from "@situ/protocol";
import { useActivitiesFor } from "./use-activities-for";

export function useExperimentActivities(experimentId: string): ActivityRecord[] {
  return useActivitiesFor("experimentActivities/", "experimentId", experimentId);
}
