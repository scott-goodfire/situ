import type { ExperimentRecord } from "@almanac/protocol";
import {
  DxBadge,
  DxSection,
  DxTable,
  type DxBadgeTone,
  type DxTableColumn,
} from "@almanac/web-ui";

const experimentColumns: Array<DxTableColumn<ExperimentRecord>> = [
  {
    id: "experiment",
    header: "Experiment",
    width: "250px",
    renderCell: ({ row: experiment }) => <span className="dx-mono">{experiment.id}</span>,
  },
  {
    id: "status",
    header: "Status",
    width: "140px",
    renderCell: ({ row: experiment }) => (
      <DxBadge tone={experimentTone({ experiment })}>{experimentState({ experiment })}</DxBadge>
    ),
  },
  {
    id: "components",
    header: "Components",
    width: "180px",
    renderCell: ({ row: experiment }) => experimentComponents({ experiment }),
  },
  {
    id: "note",
    header: "Note",
    renderCell: ({ row: experiment }) => experimentNote({ experiment }),
  },
];

export function ExperimentTable({ experiments }: { experiments: ExperimentRecord[] }) {
  const visibleExperiments = experiments.slice(-12);

  return (
    <DxSection title="Experiments">
      <DxTable
        columns={experimentColumns}
        rows={visibleExperiments}
        getRowKey={({ row: experiment }) => experiment.id}
        emptyLabel="None yet"
      />
    </DxSection>
  );
}

function experimentState({ experiment }: { experiment: ExperimentRecord }): string {
  if (experiment.suspicious) {
    return "suspicious";
  }

  return experiment.status;
}

function experimentTone({ experiment }: { experiment: ExperimentRecord }): DxBadgeTone {
  if (experiment.suspicious) {
    return "warning";
  }

  if (experiment.status === "failed") {
    return "danger";
  }

  if (experiment.status === "completed") {
    return "success";
  }

  return "neutral";
}

function experimentComponents({ experiment }: { experiment: ExperimentRecord }): string {
  if (experiment.components.length === 0) {
    return "none";
  }

  return experiment.components.join("+");
}

function experimentNote({ experiment }: { experiment: ExperimentRecord }): string {
  if (experiment.suspicious_reason) {
    return experiment.suspicious_reason;
  }

  if (experiment.note) {
    return experiment.note;
  }

  return experiment.intent;
}
