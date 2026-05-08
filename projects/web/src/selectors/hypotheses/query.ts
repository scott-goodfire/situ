import type { HypothesisActivityRecord } from "@situ/protocol";
import filter from "lodash/filter";
import type { ProjectWorkspaceData } from "../../features/project-workspace/types";

export function hypothesisActivitiesForHypothesis({
  data,
  hypothesisId,
}: {
  data: ProjectWorkspaceData;
  hypothesisId: string;
}): HypothesisActivityRecord[] {
  return filter(
    data.hypothesisActivities,
    (activity) => activity.hypothesis_id === hypothesisId,
  );
}
