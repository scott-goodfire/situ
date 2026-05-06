import type {
  ExperimentActivityRecord,
} from "@situ/protocol";
import filter from "lodash/filter";
import type { ProjectWorkspaceData } from "../../features/project-workspace/types";

export function experimentActivitiesForExperiment({
  data,
  experimentId,
}: {
  data: ProjectWorkspaceData;
  experimentId: string;
}): ExperimentActivityRecord[] {
  return filter(
    data.experimentActivities,
    (activity) => activity.experiment_id === experimentId,
  );
}

export function hasConcernActivities({
  activities,
}: {
  activities: ExperimentActivityRecord[];
}): boolean {
  return activities.some(
    (activity) => activity.payload?.activity_type === "concern",
  );
}
