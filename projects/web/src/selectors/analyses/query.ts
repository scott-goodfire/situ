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
  return filter(
    data.analyses,
    (analysis) => analysis.project_id === data.projectId,
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
