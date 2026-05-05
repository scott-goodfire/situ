import type { HypothesisRecord } from "@situ/protocol";
import {
  DxBadge,
  DxSection,
  DxTable,
  type DxBadgeTone,
  type DxTableColumn,
} from "@situ/web-ui";
import { Link } from "@tanstack/react-router";
import filter from "lodash/filter";
import { EvidenceSummary } from "../evidence/evidence-summary";
import {
  evaluationActivitiesForEvaluations,
  evaluationsForExperiments,
} from "../evidence/evaluation-selectors";
import { experimentsForHypothesis } from "../shared/relationship-selectors";
import type { ProjectWorkspaceData } from "../types";

type HypothesisRow = {
  hypothesis: HypothesisRecord;
  experimentCount: number;
  latestActivity: string;
  evaluations: ReturnType<typeof evaluationsForExperiments>;
  evaluationActivities: ReturnType<typeof evaluationActivitiesForEvaluations>;
};

export function HypothesesPage({ data }: { data: ProjectWorkspaceData }) {
  const columns = hypothesisColumns({ projectId: data.projectId });
  const rows = data.hypotheses.map((hypothesis) => {
    const experiments = experimentsForHypothesis({
      data,
      hypothesisId: hypothesis.id,
    });
    const evaluations = evaluationsForExperiments({
      data,
      experiments,
    });
    const evaluationActivities = evaluationActivitiesForEvaluations({
      data,
      evaluations,
    });

    return {
      hypothesis,
      experimentCount: experiments.length,
      latestActivity: latestHypothesisActivity({
        data,
        hypothesisId: hypothesis.id,
      }),
      evaluations,
      evaluationActivities,
    };
  });

  return (
    <DxSection title="Hypotheses">
      <DxTable
        columns={columns}
        rows={rows}
        getRowKey={({ row }) => row.hypothesis.id}
        emptyLabel="No hypotheses yet"
        density="compact"
        stickyHeader
        sortable
      />
    </DxSection>
  );
}

function hypothesisColumns({
  projectId,
}: {
  projectId: string;
}): Array<DxTableColumn<HypothesisRow>> {
  return [
    {
      id: "hypothesis",
      header: "Hypothesis",
      width: "30%",
      renderCell: ({ row }) => (
        <div className="situ-record-cell">
          <Link
            className="situ-record-link"
            to="/projects/$projectId/hypotheses/$hypothesisId"
            params={{
              projectId,
              hypothesisId: row.hypothesis.id,
            }}
          >
            {row.hypothesis.title}
          </Link>
          <span className="situ-record-id">{row.hypothesis.id}</span>
        </div>
      ),
      sortValue: ({ row }) => row.hypothesis.title,
    },
    {
      id: "status",
      header: "Status",
      width: "120px",
      renderCell: ({ row }) => (
        <DxBadge tone={statusTone({ status: row.hypothesis.status })}>
          {row.hypothesis.status}
        </DxBadge>
      ),
      sortValue: ({ row }) => row.hypothesis.status,
    },
    {
      id: "experiments",
      header: "Experiments",
      width: "120px",
      renderCell: ({ row }) => <span className="dx-mono">{row.experimentCount}</span>,
      sortValue: ({ row }) => row.experimentCount,
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

function latestHypothesisActivity({
  data,
  hypothesisId,
}: {
  data: ProjectWorkspaceData;
  hypothesisId: string;
}): string {
  const activities = filter(
    data.hypothesisActivities,
    (activity) => activity.hypothesis_id === hypothesisId,
  );

  return activities.at(-1)?.body ?? "No activity yet";
}

function statusTone({
  status,
}: {
  status: HypothesisRecord["status"];
}): DxBadgeTone {
  if (status === "active") {
    return "success";
  }

  if (status === "closed") {
    return "neutral";
  }

  return "warning";
}
