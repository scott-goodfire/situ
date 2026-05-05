import type { ExperimentActivityRecord, ExperimentRecord } from "@almanac/protocol";
import {
  DxBadge,
  DxSection,
  DxTable,
  type DxBadgeTone,
  type DxTableColumn,
} from "@almanac/web-ui";
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
  },
  {
    id: "status",
    header: "Status",
    width: "140px",
    renderCell: ({ row }) => (
      <DxBadge tone={experimentTone({ row })}>{experimentState({ row })}</DxBadge>
    ),
  },
  {
    id: "title",
    header: "Title",
    width: "220px",
    renderCell: ({ row }) => row.experiment.title,
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
      />
    </DxSection>
  );
}

function experimentState({ row }: { row: ExperimentRow }): string {
  if (row.activities.some((activity) => activity.kind === "concern")) {
    return "concern";
  }

  return row.experiment.status;
}

function experimentTone({ row }: { row: ExperimentRow }): DxBadgeTone {
  if (row.activities.some((activity) => activity.kind === "concern")) {
    return "warning";
  }

  if (row.experiment.status === "closed") {
    return "success";
  }

  return "neutral";
}

function experimentNote({ row }: { row: ExperimentRow }): string {
  return row.activities.at(-1)?.body ?? row.experiment.summary;
}
