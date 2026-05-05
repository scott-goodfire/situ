import type { ExperimentActivityRecord, ExperimentRecord } from "@situ/protocol";
import {
  DxBadge,
  DxSection,
  DxTable,
  type DxBadgeTone,
  type DxTableColumn,
  type DxTableRowTone,
} from "@situ/web-ui";
import filter from "lodash/filter";

type ExperimentRow = {
  experiment: ExperimentRecord;
  activities: ExperimentActivityRecord[];
};

const experimentColumns: Array<DxTableColumn<ExperimentRow>> = [
  {
    id: "experiment",
    header: "Experiment",
    width: "250px",
    renderCell: ({ row }) => <span className="dx-mono">{row.experiment.id}</span>,
    sortValue: ({ row }) => row.experiment.id,
  },
  {
    id: "status",
    header: "Status",
    width: "140px",
    renderCell: ({ row }) => (
      <DxBadge tone={experimentTone({ row })}>{experimentState({ row })}</DxBadge>
    ),
    sortValue: ({ row }) => experimentState({ row }),
  },
  {
    id: "title",
    header: "Title",
    width: "220px",
    renderCell: ({ row }) => row.experiment.title,
    sortValue: ({ row }) => row.experiment.title,
  },
  {
    id: "note",
    header: "Latest Activity",
    renderCell: ({ row }) => experimentNote({ row }),
  },
];

export function ExperimentTable({
  experiments,
  experimentActivities,
}: {
  experiments: ExperimentRecord[];
  experimentActivities: ExperimentActivityRecord[];
}) {
  const visibleRows = experiments.slice(-12).map((experiment) => ({
    experiment,
    activities: filter(
      experimentActivities,
      (activity) => activity.experiment_id === experiment.id,
    ),
  }));

  return (
    <DxSection title="Experiments">
      <DxTable
        columns={experimentColumns}
        rows={visibleRows}
        getRowKey={({ row }) => row.experiment.id}
        emptyLabel="None yet"
        density="compact"
        maxHeight="360px"
        stickyHeader
        animateRows
        autoScroll
        getRowTone={experimentRowTone}
      />
    </DxSection>
  );
}

function experimentState({ row }: { row: ExperimentRow }): string {
  if (hasConcern(row.activities)) {
    return "concern";
  }

  return row.experiment.status;
}

function experimentTone({ row }: { row: ExperimentRow }): DxBadgeTone {
  if (hasConcern(row.activities)) {
    return "warning";
  }

  if (row.experiment.status === "closed") {
    return "success";
  }

  return "neutral";
}

function experimentRowTone({ row }: { row: ExperimentRow }): DxTableRowTone {
  if (hasConcern(row.activities)) {
    return "warning";
  }

  return "neutral";
}

function experimentNote({ row }: { row: ExperimentRow }): string {
  return row.activities.at(-1)?.body ?? row.experiment.summary;
}

function hasConcern(activities: ExperimentActivityRecord[]): boolean {
  return activities.some((activity) => activity.payload?.activity_type === "concern");
}
