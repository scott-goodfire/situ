import type { ExperimentActivityRecord } from "@situ/protocol";
import filter from "lodash/filter";
import type { ProjectWorkspaceData } from "../../features/project-workspace/types";
import {
  computeLaneLayout,
  type LineageGraphLayout,
} from "./__shared__/lane-layout";

export type CriticStatus = "concern" | "reviewed" | "pending";

export function experimentLineageGraph({
  data,
}: {
  data: ProjectWorkspaceData;
}): LineageGraphLayout {
  return computeLaneLayout({ experiments: data.experiments });
}

export function criticStatusForExperiment({
  activities,
}: {
  activities: ExperimentActivityRecord[];
}): CriticStatus {
  if (activities.some((a) => a.payload?.activity_type === "concern")) {
    return "concern";
  }
  if (activities.some((a) => a.payload?.activity_type === "critic_review")) {
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

export function hypothesisLabelsByExperiment({
  data,
}: {
  data: ProjectWorkspaceData;
}): Map<string, string[]> {
  const result = new Map<string, string[]>();
  for (const link of data.hypothesisExperimentLinks) {
    const list = result.get(link.experiment_id) ?? [];
    list.push(link.hypothesis_id);
    result.set(link.experiment_id, list);
  }
  return result;
}

export function evaluationsByExperiment({
  data,
}: {
  data: ProjectWorkspaceData;
}): Map<string, typeof data.evaluations> {
  const result = new Map<string, typeof data.evaluations>();
  for (const evaluation of data.evaluations) {
    const experimentId = evaluation.associated_experiment_id;
    if (!experimentId) continue;
    const list = result.get(experimentId) ?? [];
    list.push(evaluation);
    result.set(experimentId, list);
  }
  return result;
}

export function rootExperimentIds({
  data,
}: {
  data: ProjectWorkspaceData;
}): string[] {
  return filter(
    data.experiments,
    (e) => !e.parent_experiment_id,
  ).map((e) => e.id);
}
