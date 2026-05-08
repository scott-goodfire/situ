import { EvaluationsPageView } from "@situ/web-app-ui";
import { Link } from "@tanstack/react-router";
import {
  evaluationActivitiesForEvaluation,
  sourceExperimentForEvaluation,
} from "../../../selectors/evaluations";
import * as s from "../../../styles.css";
import type { ProjectWorkspaceData } from "../types";
import {
  evaluationRowTone,
  projectRouteParams,
  recordLink,
  researchStatusTone,
} from "../view-adapters";

export function EvaluationsPage({ data }: { data: ProjectWorkspaceData }) {
  const params = projectRouteParams({ data });

  return (
    <EvaluationsPageView
      rows={data.evaluations.map((evaluation) => {
        const activities = evaluationActivitiesForEvaluation({ data, evaluationId: evaluation.id });
        const sourceExperiment = sourceExperimentForEvaluation({ data, evaluation });

        return {
          evaluation,
          title: recordLink({
            to: "/workspaces/$workspaceId/projects/$projectId/evaluations/$evaluationId",
            params: { ...params, evaluationId: evaluation.id },
            children: evaluation.title,
          }),
          statusLabel: evaluation.status,
          statusSort: evaluation.status,
          statusTone: researchStatusTone({ status: evaluation.status }),
          source: sourceExperiment ? (
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
              <span>Baseline</span>
              {evaluation.created_in_session_id && (
                <span className={s.recordId}>{evaluation.created_in_session_id}</span>
              )}
            </div>
          ),
          sourceSort: sourceExperiment?.title ?? "Baseline",
          openAction: (
            <Link
              className={s.projectOpen}
              to="/workspaces/$workspaceId/projects/$projectId/evaluations/$evaluationId"
              params={{ ...params, evaluationId: evaluation.id }}
              aria-label={`Open evaluation ${evaluation.id}`}
            >
              Open
            </Link>
          ),
          rowTone: evaluationRowTone({ activities }),
        };
      })}
    />
  );
}
