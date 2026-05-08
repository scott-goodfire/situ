import { AnalysisDetailView } from "@situ/web-app-ui";
import { analysisActivitiesForAnalysis } from "../../../selectors/analyses";
import type { ProjectWorkspaceData } from "../types";
import { activityItem } from "../view-adapters";

export function AnalysisDetailPage({
  data,
  analysisId,
}: {
  data: ProjectWorkspaceData;
  analysisId: string;
}) {
  const analysis = data.analyses.find((record) => record.id === analysisId);

  return (
    <AnalysisDetailView
      analysis={analysis}
      activities={analysisActivitiesForAnalysis({ data, analysisId }).map((activity) =>
        activityItem({
          prefix: "analysis-activity",
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
