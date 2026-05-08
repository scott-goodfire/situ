import { ExperimentsPageView } from "@situ/web-app-ui";
import {
  evaluationActivitiesForEvaluations,
  evaluationsForExperiment,
} from "../../../selectors/evaluations";
import { linkedHypothesisCount } from "../../../selectors/experiments";
import type { ProjectWorkspaceData } from "../types";
import { evidenceSummary, projectRouteParams, recordLink } from "../view-adapters";

export function ExperimentsPage({ data }: { data: ProjectWorkspaceData }) {
  const params = projectRouteParams({ data });

  return (
    <ExperimentsPageView
      rows={data.experiments.map((experiment) => {
        const evaluations = evaluationsForExperiment({ data, experimentId: experiment.id });
        const evaluationActivities = evaluationActivitiesForEvaluations({ data, evaluations });
        return {
          experiment,
          title: recordLink({
            to: "/workspaces/$workspaceId/projects/$projectId/experiments/$experimentId",
            params: { ...params, experimentId: experiment.id },
            children: experiment.title,
          }),
          hypothesisCount: linkedHypothesisCount({ data, experimentId: experiment.id }),
          evidence: evidenceSummary({ evaluations, activities: evaluationActivities }),
        };
      })}
    />
  );
}
