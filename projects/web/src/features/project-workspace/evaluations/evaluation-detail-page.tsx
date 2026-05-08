import { EvaluationDetailView } from "@situ/web-app-ui";
import {
  activityLabel,
  artifactsForEvaluation,
  evaluationActivitiesForEvaluation,
  sourceExperimentForEvaluation,
} from "../../../selectors/evaluations";
import * as s from "../../../styles.css";
import type { ProjectWorkspaceData } from "../types";
import { projectRouteParams, recordLink } from "../view-adapters";

export function EvaluationDetailPage({
  data,
  evaluationId,
}: {
  data: ProjectWorkspaceData;
  evaluationId: string;
}) {
  const evaluation = data.evaluations.find((record) => record.id === evaluationId);
  const activities = evaluationActivitiesForEvaluation({ data, evaluationId });
  const sourceExperiment = evaluation
    ? sourceExperimentForEvaluation({ data, evaluation })
    : undefined;
  const params = projectRouteParams({ data });

  return (
    <EvaluationDetailView
      evaluation={evaluation}
      source={
        sourceExperiment ? (
          <div className={s.recordCell}>
            {recordLink({
              to: "/workspaces/$workspaceId/projects/$projectId/experiments/$experimentId",
              params: { ...params, experimentId: sourceExperiment.id },
              children: sourceExperiment.title,
            })}
            <span className={s.recordId}>{sourceExperiment.id}</span>
          </div>
        ) : (
          <div className={s.recordCell}>
            <span>Baseline evidence</span>
            {evaluation?.created_in_session_id && (
              <span className={s.recordId}>{evaluation.created_in_session_id}</span>
            )}
          </div>
        )
      }
      artifacts={artifactsForEvaluation({ data, evaluationId })}
      activities={activities.slice(-5).map((activity) => ({
        id: `evaluation-activity-${activity.id}`,
        actor: activity.actor,
        body: activity.body,
        kind: activityLabel({ activity }),
        createdAt: activity.created_at,
      }))}
    />
  );
}
