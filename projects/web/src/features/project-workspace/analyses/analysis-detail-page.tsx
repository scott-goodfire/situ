import { DxBadge, DxEmptyState, DxSection } from "@situ/web-ui";
import { analysisActivitiesForAnalysis } from "../../../selectors/analyses";
import * as s from "../../../styles.css";
import { ActivityTimeline } from "../__shared__/activity-timeline";
import type { ActivityItem, ProjectWorkspaceData } from "../types";

export function AnalysisDetailPage({
  data,
  analysisId,
}: {
  data: ProjectWorkspaceData;
  analysisId: string;
}) {
  const analysis = data.analyses.find((record) => record.id === analysisId);

  if (!analysis) {
    return (
      <DxEmptyState
        heading="Analysis not found"
        description={`No analysis exists with id ${analysisId}.`}
      />
    );
  }

  const activities = analysisActivitiesForAnalysis({ data, analysisId }).map(
    (activity): ActivityItem => ({
      id: `analysis-activity-${activity.id}`,
      actor: activity.actor,
      body: activity.body,
      kind: activity.payload?.activity_type
        ? String(activity.payload.activity_type)
        : activity.kind,
      createdAt: activity.created_at,
    }),
  );

  return (
    <>
      <section className={s.objectPage}>
        <div className={s.objectPageHeader}>
          <div>
            <p className={s.objectPageEyebrow}>{analysis.id}</p>
            <h2>{analysis.title}</h2>
          </div>
          <DxBadge tone={analysis.status === "active" ? "success" : "neutral"}>
            {analysis.status}
          </DxBadge>
        </div>
        {analysis.summary && <p className={s.objectPageSummary}>{analysis.summary}</p>}
      </section>

      {analysis.content && (
        <DxSection title="Content">
          <p className={s.objectPageSummary}>{analysis.content}</p>
        </DxSection>
      )}

      <ActivityTimeline
        title="Activity"
        activities={activities}
        emptyLabel="No analysis activity yet"
      />
    </>
  );
}
