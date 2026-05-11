import type { ActivityRecord } from "@situ/protocol";
import type { ReactNode } from "react";
import { DxBadge, DxEmptyState, DxMarkdown, DxSection, DxTime, mono } from "@situ/web-ui";
import { ActivityTimeline, ObjectHeader, researchStatusTone } from "../../__shared__";
import type { BaselineRecord } from "../../domain/records";
import * as s from "../../styles.css";

export function BaselineDetailView({
  back,
  baseline,
  activities,
}: {
  back?: ReactNode;
  baseline: BaselineRecord | undefined;
  activities?: ActivityRecord[];
}) {
  if (!baseline) {
    return (
      <DxEmptyState heading="Baseline not found" description="No baseline exists with this id." />
    );
  }

  return (
    <>
      <ObjectHeader
        back={back}
        eyebrow={baseline.id}
        title={baseline.title}
        status={
          <DxBadge tone={researchStatusTone({ status: baseline.status })}>
            {baseline.status}
          </DxBadge>
        }
        summary={<DxMarkdown>{baseline.summary}</DxMarkdown>}
      />
      <DxSection title="Details">
        <dl className={s.detailGrid}>
          <dt className={s.detailLabel}>Created</dt>
          <dd className={s.detailValue}>
            <DxTime iso={baseline.createdAt} className={mono} />
          </dd>
          <dt className={s.detailLabel}>Updated</dt>
          <dd className={s.detailValue}>
            <DxTime iso={baseline.updatedAt} className={mono} />
          </dd>
          <dt className={s.detailLabel}>Created by ResearchTask</dt>
          <dd className={s.detailValue}>
            {baseline.createdByResearchTaskId ?? <span className={s.cellMuted}>—</span>}
          </dd>
        </dl>
      </DxSection>
      {activities && (
        <ActivityTimeline
          title="Activity"
          activities={activities}
          emptyLabel="No baseline activity yet"
        />
      )}
    </>
  );
}
