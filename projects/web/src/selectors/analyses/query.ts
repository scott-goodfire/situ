import type {
  AnalysisActivityRecord,
  AnalysisRecord,
} from "@situ/protocol";
import filter from "lodash/filter";
import type { ProjectWorkspaceData } from "../../features/project-workspace/types";

export function analysesForProject({
  data,
}: {
  data: ProjectWorkspaceData;
}): AnalysisRecord[] {
  const projectId = data.ledgerProjectId ?? data.projectId;

  return filter(
    data.analyses,
    (analysis) => analysis.project_id === projectId,
  );
}

export function analysisActivitiesForAnalysis({
  data,
  analysisId,
}: {
  data: ProjectWorkspaceData;
  analysisId: string;
}): AnalysisActivityRecord[] {
  return filter(
    data.analysisActivities,
    (activity) => activity.analysis_id === analysisId,
  );
}
