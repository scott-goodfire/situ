import { AnalysesPageView } from "@situ/web-app-ui";
import { analysesForProject } from "../../../selectors/analyses";
import type { ProjectWorkspaceData } from "../types";
import { projectRouteParams, recordLink } from "../view-adapters";

export function AnalysesPage({ data }: { data: ProjectWorkspaceData }) {
  const params = projectRouteParams({ data });

  return (
    <AnalysesPageView
      rows={analysesForProject({ data }).map((analysis) => ({
        analysis,
        title: recordLink({
          to: "/workspaces/$workspaceId/projects/$projectId/analyses/$analysisId",
          params: { ...params, analysisId: analysis.id },
          children: analysis.title,
        }),
      }))}
    />
  );
}
