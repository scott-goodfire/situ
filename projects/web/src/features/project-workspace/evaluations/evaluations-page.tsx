import type {
  EvaluationActivityRecord,
  EvaluationRecord,
  ExperimentRecord,
} from "@almanac/protocol";
import {
  DxBadge,
  DxSection,
  DxTable,
  type DxBadgeTone,
  type DxTableColumn,
  type DxTableRowTone,
} from "@almanac/web-ui";
import { Link } from "@tanstack/react-router";
import { DateTime } from "luxon";
import {
  activityLabel,
  evaluationActivitiesForEvaluation,
  evidenceRowTone,
  isConcernActivity,
  latestEvaluationActivity,
} from "../evidence/evaluation-selectors";
import type { ProjectWorkspaceData } from "../types";

type EvaluationRow = {
  evaluation: EvaluationRecord;
  activities: EvaluationActivityRecord[];
  sourceExperiment: ExperimentRecord | undefined;
};

export function EvaluationsPage({ data }: { data: ProjectWorkspaceData }) {
  const columns = evaluationColumns({
    projectId: data.projectId,
  });
  const rows = data.evaluations.map((evaluation) => ({
    evaluation,
    activities: evaluationActivitiesForEvaluation({
      data,
      evaluationId: evaluation.id,
    }),
    sourceExperiment: sourceExperimentForEvaluation({
      data,
      evaluation,
    }),
  }));

  return (
    <DxSection title="Evaluations">
      <DxTable
        columns={columns}
        rows={rows}
        getRowKey={({ row }) => row.evaluation.id}
        emptyLabel="No evaluations yet"
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
        <div className="almanac-record-cell">
          <Link
            className="almanac-record-link"
            to="/projects/$projectId/evaluations/$evaluationId"
            params={{
              projectId,
              evaluationId: row.evaluation.id,
            }}
          >
            {row.evaluation.title}
          </Link>
          <span className="almanac-record-id">{row.evaluation.id}</span>
        </div>
      ),
      sortValue: ({ row }) => row.evaluation.title,
    },
    {
      id: "status",
      header: "Status",
      width: "130px",
      renderCell: ({ row }) => (
        <DxBadge tone={statusTone({ row })}>{statusLabel({ row })}</DxBadge>
      ),
      sortValue: ({ row }) => statusLabel({ row }),
    },
    {
      id: "source",
      header: "Source",
      width: "240px",
      renderCell: ({ row }) => sourceCell({ row, projectId }),
      sortValue: ({ row }) => row.sourceExperiment?.title ?? "Baseline",
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
        <span className="dx-mono">
          {formatTime({ value: row.evaluation.updated_at })}
        </span>
      ),
      sortValue: ({ row }) => row.evaluation.updated_at,
    },
  ];
}

function sourceCell({
  row,
  projectId,
}: {
  row: EvaluationRow;
  projectId: string;
}) {
  if (row.sourceExperiment) {
    return (
      <div className="almanac-record-cell">
        <Link
          className="almanac-record-link"
          to="/projects/$projectId/experiments/$experimentId"
          params={{
            projectId,
            experimentId: row.sourceExperiment.id,
          }}
        >
          {row.sourceExperiment.title}
        </Link>
        <span className="almanac-record-id">{row.sourceExperiment.id}</span>
      </div>
    );
  }

  return (
    <div className="almanac-record-cell">
      <span>Baseline</span>
      <span className="almanac-record-id">{row.evaluation.session_id}</span>
    </div>
  );
}

function latestEvidence({ row }: { row: EvaluationRow }) {
  const latestActivity = latestEvaluationActivity({
    activities: row.activities,
  });

  if (!latestActivity) {
    return row.evaluation.summary;
  }

  return (
    <div className="almanac-evaluation-latest">
      <span className="dx-mono">{activityLabel({ activity: latestActivity })}</span>
      <span>{latestActivity.body}</span>
    </div>
  );
}

function sourceExperimentForEvaluation({
  data,
  evaluation,
}: {
  data: ProjectWorkspaceData;
  evaluation: EvaluationRecord;
}): ExperimentRecord | undefined {
  if (!evaluation.associated_experiment_id) {
    return undefined;
  }

  return data.experiments.find(
    (experiment) => experiment.id === evaluation.associated_experiment_id,
  );
}

function statusLabel({ row }: { row: EvaluationRow }): string {
  if (row.activities.some((activity) => isConcernActivity({ activity }))) {
    return "concern";
  }

  return row.evaluation.status;
}

function statusTone({ row }: { row: EvaluationRow }): DxBadgeTone {
  if (statusLabel({ row }) === "concern") {
    return "warning";
  }

  if (row.evaluation.status === "closed") {
    return "success";
  }

  if (row.evaluation.status === "active") {
    return "warning";
  }

  return "neutral";
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
