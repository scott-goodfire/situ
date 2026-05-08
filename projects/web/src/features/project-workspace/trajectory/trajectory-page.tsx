import {
  TrajectoryPageView,
  type CriticStatus,
  type TrajectoryDetailViewData,
  type LoadArtifactContent,
} from "@situ/web-app-ui";
import { useMemo } from "react";
import {
  evaluationActivitiesForEvaluation,
  evaluationsForExperiment,
} from "../../../selectors/evaluations";
import {
  artifactsForExperiment,
  criticStatusForExperiment,
  experimentActivitiesForExperiment,
  hypothesesForExperiment,
} from "../../../selectors/experiments";
import type { ProjectWorkspaceData } from "../types";
import {
  activityItem,
  evaluationRows,
  projectRouteParams,
  projectTrajectoryLink,
  recordLink,
} from "../view-adapters";

export function TrajectoryPage({
  data,
  selectedExperimentId,
  onSelect,
  loadArtifactContent,
  initialDetailTab,
}: {
  data: ProjectWorkspaceData;
  selectedExperimentId: string | undefined;
  onSelect: ({ experimentId }: { experimentId: string }) => void;
  loadArtifactContent?: LoadArtifactContent;
  initialDetailTab?: "overview" | "diff";
}) {
  const failedExperimentIds = useMemo(
    () => failedExperimentsFromTasks({ data }),
    [data],
  );
  const criticStatusByExperimentId = useMemo(
    () => criticStatusMap({ data }),
    [data],
  );

  return (
    <TrajectoryPageView
      experiments={data.experiments}
      selectedExperimentId={selectedExperimentId}
      failedExperimentIds={failedExperimentIds}
      criticStatusByExperimentId={criticStatusByExperimentId}
      detail={trajectoryDetail({ data, experimentId: selectedExperimentId })}
      onSelect={onSelect}
      loadArtifactContent={loadArtifactContent}
      initialDetailTab={initialDetailTab}
    />
  );
}

function trajectoryDetail({
  data,
  experimentId,
}: {
  data: ProjectWorkspaceData;
  experimentId: string | undefined;
}): TrajectoryDetailViewData | undefined {
  if (!experimentId) return undefined;
  const experiment = data.experiments.find((record) => record.id === experimentId);
  if (!experiment) {
    return {
      experiment: undefined,
      linkedHypotheses: [],
      artifacts: [],
      evidenceRows: [],
      activities: [],
    };
  }
  const parent = experiment.parent_experiment_id
    ? data.experiments.find((record) => record.id === experiment.parent_experiment_id)
    : undefined;
  const evaluations = evaluationsForExperiment({ data, experimentId });
  const params = projectRouteParams({ data });

  return {
    experiment,
    parent: parent
      ? projectTrajectoryLink({
          projectId: data.projectId,
          workspaceId: data.workspaceId,
          experimentId: parent.id,
          children: parent.id,
        })
      : undefined,
    linkedHypotheses: hypothesesForExperiment({ data, experimentId }).map((hypothesis) => ({
      id: hypothesis.id,
      title: recordLink({
        to: "/workspaces/$workspaceId/projects/$projectId/hypotheses/$hypothesisId",
        params: { ...params, hypothesisId: hypothesis.id },
        children: hypothesis.title,
      }),
      summary: hypothesis.summary,
    })),
    artifacts: artifactsForExperiment({ data, experimentId }),
    evidenceRows: evaluationRows({
      evaluations,
      projectId: data.projectId,
      workspaceId: data.workspaceId,
      activitiesForEvaluation: (evaluationId) =>
        evaluationActivitiesForEvaluation({ data, evaluationId }),
    }),
    activities: experimentActivitiesForExperiment({ data, experimentId }).map((activity) =>
      activityItem({
        prefix: "experiment-activity",
        id: activity.id,
        actor: activity.actor,
        body: activity.body,
        kind: activity.kind,
        payload: activity.payload,
        createdAt: activity.created_at,
      }),
    ),
  };
}

function failedExperimentsFromTasks({ data }: { data: ProjectWorkspaceData }): Set<string> {
  const failedTaskIds = new Set(
    data.tasks.filter((task) => task.status === "failed").map((task) => task.id),
  );
  if (failedTaskIds.size === 0) return new Set();

  const failed = new Set<string>();
  for (const link of data.taskEntityLinks) {
    if (link.entity_kind !== "experiment") continue;
    if (!failedTaskIds.has(link.task_id)) continue;
    failed.add(link.entity_id);
  }
  return failed;
}

function criticStatusMap({ data }: { data: ProjectWorkspaceData }): Map<string, CriticStatus> {
  const statuses = new Map<string, CriticStatus>();
  for (const experiment of data.experiments) {
    statuses.set(
      experiment.id,
      criticStatusForExperiment({
        activities: experimentActivitiesForExperiment({ data, experimentId: experiment.id }),
      }),
    );
  }
  return statuses;
}
