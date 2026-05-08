import { DxBadge } from "@situ/web-ui";
import { ExperimentDetailView } from "@situ/web-app-ui";
import { evaluationActivitiesForEvaluation, evaluationsForExperiment } from "../../../selectors/evaluations";
import {
  artifactsForExperiment,
  experimentActivitiesForExperiment,
  hypothesesForExperiment,
} from "../../../selectors/experiments";
import type { ProjectWorkspaceData } from "../types";
import { activityItem, evaluationRows, projectRouteParams, recordLink } from "../view-adapters";

export function ExperimentDetailPage({
  data,
  experimentId,
}: {
  data: ProjectWorkspaceData;
  experimentId: string;
}) {
  const experiment = data.experiments.find((record) => record.id === experimentId);
  const linkedHypotheses = hypothesesForExperiment({ data, experimentId });
  const evaluations = evaluationsForExperiment({ data, experimentId });
  const params = projectRouteParams({ data });

  return (
    <ExperimentDetailView
      experiment={experiment}
      linkedHypotheses={linkedHypotheses.map((hypothesis) => ({
        id: hypothesis.id,
        title: recordLink({
          to: "/workspaces/$workspaceId/projects/$projectId/hypotheses/$hypothesisId",
          params: { ...params, hypothesisId: hypothesis.id },
          children: hypothesis.title,
        }),
        titleSort: hypothesis.title,
        status: <DxBadge>{hypothesis.status}</DxBadge>,
        summary: hypothesis.summary,
      }))}
      evidenceRows={evaluationRows({
        evaluations,
        projectId: data.projectId,
        workspaceId: data.workspaceId,
        activitiesForEvaluation: (evaluationId) =>
          evaluationActivitiesForEvaluation({ data, evaluationId }),
      })}
      artifacts={artifactsForExperiment({ data, experimentId })}
      activities={experimentActivitiesForExperiment({ data, experimentId }).map((activity) =>
        activityItem({
          prefix: "experiment-activity",
          id: activity.id,
          actor: activity.actor,
          body: activity.body,
          kind: activity.kind,
          payload: activity.payload,
          createdAt: activity.created_at,
        }),
      )}
    />
  );
}
