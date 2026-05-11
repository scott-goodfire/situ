import type { ActivityRecord } from "@situ/protocol";
import type { ReactNode } from "react";
import { DxBadge, DxEmptyState, DxMarkdown, DxSection, DxTime, mono } from "@situ/web-ui";
import { ActivityTimeline, ObjectHeader, researchStatusTone } from "../../__shared__";
import type { HypothesisRecord } from "../../domain/records";
import * as s from "../../styles.css";

export function HypothesisDetailView({
  back,
  hypothesis,
  activities,
}: {
  back?: ReactNode;
  hypothesis: HypothesisRecord | undefined;
  activities?: ActivityRecord[];
}) {
  if (!hypothesis) {
    return (
      <DxEmptyState
        heading="Hypothesis not found"
        description="No hypothesis exists with this id."
      />
    );
  }

  return (
    <>
      <ObjectHeader
        back={back}
        eyebrow={hypothesis.id}
        title={hypothesis.title}
        status={
          <DxBadge tone={researchStatusTone({ status: hypothesis.status })}>
            {hypothesis.status}
          </DxBadge>
        }
        summary={<DxMarkdown>{hypothesis.summary}</DxMarkdown>}
      />
      <DxSection title="Details">
        <dl className={s.detailGrid}>
          <dt className={s.detailLabel}>Created</dt>
          <dd className={s.detailValue}>
            <DxTime iso={hypothesis.createdAt} className={mono} />
          </dd>
          <dt className={s.detailLabel}>Updated</dt>
          <dd className={s.detailValue}>
            <DxTime iso={hypothesis.updatedAt} className={mono} />
          </dd>
          <dt className={s.detailLabel}>Created by ResearchTask</dt>
          <dd className={s.detailValue}>
            {hypothesis.createdByResearchTaskId ?? <span className={s.cellMuted}>—</span>}
          </dd>
        </dl>
      </DxSection>
      {activities && (
        <ActivityTimeline
          title="Activity"
          activities={activities}
          emptyLabel="No hypothesis activity yet"
        />
      )}
    </>
  );
}
