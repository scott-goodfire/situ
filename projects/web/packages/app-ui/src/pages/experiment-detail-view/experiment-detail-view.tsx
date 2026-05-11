import type { ActivityRecord } from "@situ/protocol";
import type { ReactNode } from "react";
import { DxBadge, DxEmptyState, DxMarkdown, DxSection, DxTime, mono } from "@situ/web-ui";
import { ActivityTimeline, ObjectHeader, researchStatusTone } from "../../__shared__";
import type { ExperimentRecord } from "../../domain/records";
import * as s from "../../styles.css";

export function ExperimentDetailView({
  back,
  experiment,
  activities,
}: {
  back?: ReactNode;
  experiment: ExperimentRecord | undefined;
  activities?: ActivityRecord[];
}) {
  if (!experiment) {
    return (
      <DxEmptyState
        heading="Experiment not found"
        description="No experiment exists with this id."
      />
    );
  }

  return (
    <>
      <ObjectHeader
        back={back}
        eyebrow={experiment.id}
        title={experiment.title}
        status={
          <DxBadge tone={researchStatusTone({ status: experiment.status })}>
            {experiment.status}
          </DxBadge>
        }
        summary={<DxMarkdown>{experiment.summary}</DxMarkdown>}
      />
      <DxSection title="Worktree">
        <dl className={s.detailGrid}>
          <dt className={s.detailLabel}>Path</dt>
          <dd className={s.detailValue}>
            {experiment.worktreePath ? (
              <code className={mono}>{experiment.worktreePath}</code>
            ) : (
              <span className={s.cellMuted}>—</span>
            )}
          </dd>
          <dt className={s.detailLabel}>Base commit</dt>
          <dd className={s.detailValue}>
            {experiment.baseCommit ? (
              <code className={mono}>{experiment.baseCommit}</code>
            ) : (
              <span className={s.cellMuted}>—</span>
            )}
          </dd>
          <dt className={s.detailLabel}>Candidate commit</dt>
          <dd className={s.detailValue}>
            {experiment.candidateCommit ? (
              <code className={mono}>{experiment.candidateCommit}</code>
            ) : (
              <span className={s.cellMuted}>—</span>
            )}
          </dd>
        </dl>
      </DxSection>
      <DxSection title="Details">
        <dl className={s.detailGrid}>
          <dt className={s.detailLabel}>Parent experiment</dt>
          <dd className={s.detailValue}>
            {experiment.parentExperimentId ?? <span className={s.cellMuted}>—</span>}
          </dd>
          <dt className={s.detailLabel}>Created</dt>
          <dd className={s.detailValue}>
            <DxTime iso={experiment.createdAt} className={mono} />
          </dd>
          <dt className={s.detailLabel}>Updated</dt>
          <dd className={s.detailValue}>
            <DxTime iso={experiment.updatedAt} className={mono} />
          </dd>
          <dt className={s.detailLabel}>Created by ResearchTask</dt>
          <dd className={s.detailValue}>
            {experiment.createdByResearchTaskId ?? <span className={s.cellMuted}>—</span>}
          </dd>
        </dl>
      </DxSection>
      {activities && (
        <ActivityTimeline
          title="Activity"
          activities={activities}
          emptyLabel="No experiment activity yet"
        />
      )}
    </>
  );
}
