import type { ActivityRecord } from "@situ/protocol";
import type { ReactNode } from "react";
import { DxBadge, DxEmptyState, DxMarkdown, DxSection, DxTime, mono } from "@situ/web-ui";
import { ActivityTimeline, ObjectHeader, researchStatusTone } from "../../__shared__";
import type { EvaluationRecord } from "../../domain/records";
import * as s from "../../styles.css";

export function EvaluationDetailView({
  back,
  evaluation,
  activities,
}: {
  back?: ReactNode;
  evaluation: EvaluationRecord | undefined;
  activities?: ActivityRecord[];
}) {
  if (!evaluation) {
    return (
      <DxEmptyState
        heading="Evaluation not found"
        description="No evaluation exists with this id."
      />
    );
  }

  return (
    <>
      <ObjectHeader
        back={back}
        eyebrow={evaluation.id}
        title={evaluation.title}
        status={
          <DxBadge tone={researchStatusTone({ status: evaluation.status })}>
            {evaluation.status}
          </DxBadge>
        }
        summary={<DxMarkdown>{evaluation.summary}</DxMarkdown>}
      />
      <DxSection title="Associations">
        <dl className={s.detailGrid}>
          <dt className={s.detailLabel}>Baseline</dt>
          <dd className={s.detailValue}>
            {evaluation.associatedBaselineId ? (
              <code className={mono}>{evaluation.associatedBaselineId}</code>
            ) : (
              <span className={s.cellMuted}>—</span>
            )}
          </dd>
          <dt className={s.detailLabel}>Experiment</dt>
          <dd className={s.detailValue}>
            {evaluation.associatedExperimentId ? (
              <code className={mono}>{evaluation.associatedExperimentId}</code>
            ) : (
              <span className={s.cellMuted}>—</span>
            )}
          </dd>
        </dl>
      </DxSection>
      <DxSection title="Details">
        <dl className={s.detailGrid}>
          <dt className={s.detailLabel}>Created</dt>
          <dd className={s.detailValue}>
            <DxTime iso={evaluation.createdAt} className={mono} />
          </dd>
          <dt className={s.detailLabel}>Updated</dt>
          <dd className={s.detailValue}>
            <DxTime iso={evaluation.updatedAt} className={mono} />
          </dd>
          <dt className={s.detailLabel}>Created by ResearchTask</dt>
          <dd className={s.detailValue}>
            {evaluation.createdByResearchTaskId ?? <span className={s.cellMuted}>—</span>}
          </dd>
        </dl>
      </DxSection>
      {activities && (
        <ActivityTimeline
          title="Activity"
          activities={activities}
          emptyLabel="No evaluation activity yet"
        />
      )}
    </>
  );
}
