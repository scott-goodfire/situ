import type {
  EvaluationActivityRecord,
  EvaluationRecord,
} from "@situ/protocol";
import { DxBadge } from "@situ/web-ui";
import * as s from "../../../styles.css";
import {
  evidenceLabel,
  evidenceState,
  evidenceTone,
  latestEvaluationActivity,
} from "../../../selectors/evaluations";

export function EvidenceSummary({
  evaluations,
  activities,
  missingLabel = "No evidence yet",
}: {
  evaluations: EvaluationRecord[];
  activities: EvaluationActivityRecord[];
  missingLabel?: string;
}) {
  const state = evidenceState({
    evaluations,
    activities,
  });
  const latestActivity = latestEvaluationActivity({ activities });
  const label = evidenceLabel({
    state,
    evaluationCount: evaluations.length,
    activityCount: activities.length,
  });

  return (
    <div className={s.evidenceSummary}>
      <DxBadge tone={evidenceTone({ state })}>{label}</DxBadge>
      <span className={s.evidenceSummaryText}>
        {latestActivity?.body ?? missingLabel}
      </span>
    </div>
  );
}
