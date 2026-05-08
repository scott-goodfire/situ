import type { ExperimentActivityRecord } from "@situ/protocol";
import type { ProjectWorkspaceData } from "../../features/project-workspace/types";

export type CriticStatus = "reviewed" | "pending";

export function criticStatusForExperiment({
  activities,
}: {
  activities: ExperimentActivityRecord[];
}): CriticStatus {
  if (
    activities.some(
      (a) => a.kind === "recorded" && a.payload?.record_type === "review_result",
    )
  ) {
    return "reviewed";
  }
  return "pending";
}

export function experimentActivitiesByExperiment({
  data,
}: {
  data: ProjectWorkspaceData;
}): Map<string, ExperimentActivityRecord[]> {
  const result = new Map<string, ExperimentActivityRecord[]>();
  for (const activity of data.experimentActivities) {
    const list = result.get(activity.experiment_id) ?? [];
    list.push(activity);
    result.set(activity.experiment_id, list);
  }
  return result;
}
