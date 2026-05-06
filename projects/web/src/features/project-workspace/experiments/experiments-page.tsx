import type { ExperimentRecord } from "@situ/protocol";
import {
  DxBadge,
  DxSection,
  DxTable,
  mono,
  type DxBadgeTone,
  type DxTableColumn,
} from "@situ/web-ui";
import { Link } from "@tanstack/react-router";
import {
  evaluationActivitiesForEvaluations,
  evaluationsForExperiment,
} from "../../../selectors/evaluations";
import {
  experimentActivitiesForExperiment,
  hasConcernActivities,
  linkedHypothesisCount,
} from "../../../selectors/experiments";
import * as s from "../../../styles.css";
import { EvidenceSummary } from "../evidence/evidence-summary";
import type { ProjectWorkspaceData } from "../types";

type ExperimentRow = {
  experiment: ExperimentRecord;
  hypothesisCount: number;
  latestActivity: string;
  hasConcern: boolean;
  evaluations: ReturnType<typeof evaluationsForExperiment>;
  evaluationActivities: ReturnType<typeof evaluationActivitiesForEvaluations>;
};

export function ExperimentsPage({ data }: { data: ProjectWorkspaceData }) {
  const columns = experimentColumns({ projectId: data.projectId });
  const rows = data.experiments.map((experiment) => {
    const activities = experimentActivitiesForExperiment({
      data,
      experimentId: experiment.id,
    });
    const evaluations = evaluationsForExperiment({
      data,
      experimentId: experiment.id,
    });
    const evaluationActivities = evaluationActivitiesForEvaluations({
      data,
      evaluations,
    });

    return {
      experiment,
      hypothesisCount: linkedHypothesisCount({
        data,
        experimentId: experiment.id,
      }),
      latestActivity: activities.at(-1)?.body ?? "No activity yet",
      hasConcern: hasConcernActivities({ activities }),
      evaluations,
      evaluationActivities,
    };
  });

  return (
    <DxSection title="Experiments">
      <DxTable
        columns={columns}
        rows={rows}
        getRowKey={({ row }) => row.experiment.id}
        emptyLabel="No experiments yet"
        density="compact"
        stickyHeader
        sortable
        getRowTone={({ row }) => (row.hasConcern ? "warning" : "neutral")}
      />
    </DxSection>
  );
}

function experimentColumns({
  projectId,
}: {
  projectId: string;
}): Array<DxTableColumn<ExperimentRow>> {
  return [
    {
      id: "experiment",
      header: "Experiment",
      width: "30%",
      renderCell: ({ row }) => (
        <div className={s.recordCell}>
          <Link
            className={s.recordLink}
            to="/projects/$projectId/experiments/$experimentId"
            params={{
              projectId,
              experimentId: row.experiment.id,
            }}
          >
            {row.experiment.title}
          </Link>
          <span className={s.recordId}>{row.experiment.id}</span>
        </div>
      ),
      sortValue: ({ row }) => row.experiment.title,
    },
    {
      id: "status",
      header: "Status",
      width: "120px",
      renderCell: ({ row }) => (
        <DxBadge tone={statusTone({ status: row.experiment.status, hasConcern: row.hasConcern })}>
          {row.hasConcern ? "concern" : row.experiment.status}
        </DxBadge>
      ),
      sortValue: ({ row }) => (row.hasConcern ? "concern" : row.experiment.status),
    },
    {
      id: "hypotheses",
      header: "Hypotheses",
      width: "120px",
      renderCell: ({ row }) => <span className={mono}>{row.hypothesisCount}</span>,
      sortValue: ({ row }) => row.hypothesisCount,
    },
    {
      id: "evidence",
      header: "Evidence",
      width: "260px",
      renderCell: ({ row }) => (
        <EvidenceSummary
          evaluations={row.evaluations}
          activities={row.evaluationActivities}
          missingLabel="No evidence yet"
        />
      ),
      sortValue: ({ row }) => row.evaluationActivities.length,
    },
    {
      id: "latest",
      header: "Latest Activity",
      renderCell: ({ row }) => row.latestActivity,
    },
  ];
}

function statusTone({
  status,
  hasConcern,
}: {
  status: ExperimentRecord["status"];
  hasConcern: boolean;
}): DxBadgeTone {
  if (hasConcern) {
    return "warning";
  }

  if (status === "closed") {
    return "success";
  }

  if (status === "active") {
    return "warning";
  }

  return "neutral";
}
