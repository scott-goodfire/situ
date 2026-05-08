import { DxBadge } from "@situ/web-ui";
import { HypothesisDetailView } from "@situ/web-app-ui";
import {
  evaluationActivitiesForEvaluations,
  evaluationsForExperiment,
} from "../../../selectors/evaluations";
import {
  experimentsForHypothesis,
  hypothesisActivitiesForHypothesis,
} from "../../../selectors/hypotheses";
import type { ProjectWorkspaceData } from "../types";
import { activityItem, evidenceSummary, projectRouteParams, recordLink } from "../view-adapters";

export function HypothesisDetailPage({
  data,
  hypothesisId,
}: {
  data: ProjectWorkspaceData;
  hypothesisId: string;
}) {
  const hypothesis = data.hypotheses.find((record) => record.id === hypothesisId);
  const linkedExperiments = experimentsForHypothesis({ data, hypothesisId });
  const params = projectRouteParams({ data });

  return (
    <HypothesisDetailView
      hypothesis={hypothesis}
      linkedExperiments={linkedExperiments.map((experiment) => {
        const evaluations = evaluationsForExperiment({ data, experimentId: experiment.id });
        const activities = evaluationActivitiesForEvaluations({ data, evaluations });
        return {
          id: experiment.id,
          title: recordLink({
            to: "/workspaces/$workspaceId/projects/$projectId/experiments/$experimentId",
            params: { ...params, experimentId: experiment.id },
            children: experiment.title,
          }),
          titleSort: experiment.title,
          status: <DxBadge>{experiment.status}</DxBadge>,
          summary: experiment.summary,
          evidence: evidenceSummary({ evaluations, activities }),
        };
      })}
      activities={hypothesisActivitiesForHypothesis({ data, hypothesisId }).map((activity) =>
        activityItem({
          prefix: "hypothesis-activity",
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
