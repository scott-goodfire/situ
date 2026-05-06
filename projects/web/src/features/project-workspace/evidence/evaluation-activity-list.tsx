import type {
  EvaluationActivityRecord,
  EvaluationRecord,
} from "@situ/protocol";
import {
  DxBadge,
  DxSection,
  DxTable,
  mono,
  type DxTableColumn,
  type DxTableRowTone,
} from "@situ/web-ui";
import { Link } from "@tanstack/react-router";
import { DateTime } from "luxon";
import * as s from "../../../styles.css";
import {
  activityLabel,
  evaluationActivitiesForEvaluation,
  evidenceRowTone,
  latestEvaluationActivity,
} from "./evaluation-selectors";
import type { ProjectWorkspaceData } from "../types";

type EvaluationRow = {
  evaluation: EvaluationRecord;
  activities: EvaluationActivityRecord[];
};

export function EvaluationActivityList({
  title,
  data,
  evaluations,
  emptyLabel,
}: {
  title: string;
  data: ProjectWorkspaceData;
  evaluations: EvaluationRecord[];
  emptyLabel: string;
}) {
  const columns = evaluationColumns({
    projectId: data.projectId,
  });
  const rows = evaluations.map((evaluation) => ({
    evaluation,
    activities: evaluationActivitiesForEvaluation({
      data,
      evaluationId: evaluation.id,
    }),
  }));

  return (
    <DxSection title={title}>
      <DxTable
        columns={columns}
        rows={rows}
        getRowKey={({ row }) => row.evaluation.id}
        emptyLabel={emptyLabel}
        density="compact"
        stickyHeader
        sortable
        getRowTone={evaluationRowTone}
      />
    </DxSection>
  );
}

function evaluationColumns({
  projectId,
}: {
  projectId: string;
}): Array<DxTableColumn<EvaluationRow>> {
  return [
    {
      id: "evaluation",
      header: "Evaluation",
      width: "28%",
      renderCell: ({ row }) => (
        <div className={s.recordCell}>
          <Link
            className={s.recordLink}
            to="/projects/$projectId/evaluations/$evaluationId"
            params={{
              projectId,
              evaluationId: row.evaluation.id,
            }}
          >
            {row.evaluation.title}
          </Link>
          <span className={s.recordId}>{row.evaluation.id}</span>
        </div>
      ),
      sortValue: ({ row }) => row.evaluation.title,
    },
    {
      id: "status",
      header: "Status",
      width: "110px",
      renderCell: ({ row }) => <DxBadge>{row.evaluation.status}</DxBadge>,
      sortValue: ({ row }) => row.evaluation.status,
    },
    {
      id: "latest",
      header: "Latest Evidence",
      renderCell: ({ row }) => latestEvidence({ row }),
    },
    {
      id: "updated",
      header: "Updated",
      width: "190px",
      renderCell: ({ row }) => (
        <span className={mono}>{formatTime({ value: row.evaluation.updated_at })}</span>
      ),
      sortValue: ({ row }) => row.evaluation.updated_at,
    },
  ];
}

function latestEvidence({ row }: { row: EvaluationRow }) {
  const latestActivity = latestEvaluationActivity({
    activities: row.activities,
  });

  if (!latestActivity) {
    return row.evaluation.summary;
  }

  return (
    <div className={s.evaluationLatest}>
      <span className={mono}>{activityLabel({ activity: latestActivity })}</span>
      <span>{latestActivity.body}</span>
    </div>
  );
}

function evaluationRowTone({ row }: { row: EvaluationRow }): DxTableRowTone {
  const latestActivity = latestEvaluationActivity({
    activities: row.activities,
  });

  if (!latestActivity) {
    return "neutral";
  }

  return evidenceRowTone({ activity: latestActivity });
}

function formatTime({ value }: { value: string }): string {
  return DateTime.fromISO(value).toLocaleString(DateTime.DATETIME_MED_WITH_SECONDS);
}
