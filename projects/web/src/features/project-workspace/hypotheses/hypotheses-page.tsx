import { HypothesesPageView } from "@situ/web-app-ui";
import {
  evaluationActivitiesForEvaluations,
  evaluationsForExperiments,
} from "../../../selectors/evaluations";
import {
  experimentsForHypothesis,
  hypothesisActivitiesForHypothesis,
} from "../../../selectors/hypotheses";
import type { ProjectWorkspaceData } from "../types";
import { evidenceSummary, projectRouteParams, recordLink } from "../view-adapters";

export function HypothesesPage({ data }: { data: ProjectWorkspaceData }) {
  const params = projectRouteParams({ data });

  return (
    <HypothesesPageView
      rows={data.hypotheses.map((hypothesis) => {
        const experiments = experimentsForHypothesis({ data, hypothesisId: hypothesis.id });
        const evaluations = evaluationsForExperiments({ data, experiments });
        const evaluationActivities = evaluationActivitiesForEvaluations({ data, evaluations });
        return {
          hypothesis,
          title: recordLink({
            to: "/workspaces/$workspaceId/projects/$projectId/hypotheses/$hypothesisId",
            params: { ...params, hypothesisId: hypothesis.id },
            children: hypothesis.title,
          }),
          experimentCount: experiments.length,
          latestActivity:
            hypothesisActivitiesForHypothesis({ data, hypothesisId: hypothesis.id }).at(-1)?.body ??
            "No activity yet",
          evidence: evidenceSummary({ evaluations, activities: evaluationActivities }),
        };
      })}
    />
  );
}
