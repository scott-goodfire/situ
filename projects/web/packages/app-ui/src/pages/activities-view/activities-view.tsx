import { DxBadge, DxSection, DxTable, DxTime, mono, type DxTableColumn } from "@situ/web-ui";
import type {
  ResearchProjectInteractionKind,
  ResearchProjectInteractionRecord,
  ResearchProjectInteractionStatus,
} from "../../domain/records";
import { researchProjectInteractionStatusTone } from "./status-tone";
import * as shared from "../../styles.css";

export function ActivitiesView({
  interactions,
}: {
  interactions: ResearchProjectInteractionRecord[];
}) {
  const sorted = [...interactions].sort((left, right) =>
    right.createdAt.localeCompare(left.createdAt),
  );
  return (
    <DxSection title="Activities">
      <DxTable
        columns={columns}
        rows={sorted}
        getRowKey={({ row }) => row.id}
        emptyLabel="No project interactions yet"
        density="compact"
        stickyHeader
        sortable
      />
    </DxSection>
  );
}

const columns: Array<DxTableColumn<ResearchProjectInteractionRecord>> = [
  {
    id: "createdAt",
    header: "When",
    width: "180px",
    renderCell: ({ row }) => <DxTime iso={row.createdAt} className={mono} />,
    sortValue: ({ row }) => row.createdAt,
  },
  {
    id: "kind",
    header: "Kind",
    width: "180px",
    renderCell: ({ row }) => (
      <span className={shared.cellTitle}>{kindLabel({ kind: row.kind })}</span>
    ),
    sortValue: ({ row }) => row.kind,
  },
  {
    id: "prompt",
    header: "Prompt",
    renderCell: ({ row }) => (
      <span className={shared.cellMuted}>{truncate({ text: row.prompt, max: 160 })}</span>
    ),
  },
  {
    id: "status",
    header: "Status",
    width: "140px",
    renderCell: ({ row }) => (
      <DxBadge tone={researchProjectInteractionStatusTone({ status: row.status })}>
        {statusLabel({ status: row.status })}
      </DxBadge>
    ),
    sortValue: ({ row }) => row.status,
  },
  {
    id: "response",
    header: "Response",
    width: "320px",
    renderCell: ({ row }) =>
      row.response ? (
        <span className={shared.cellMuted}>{truncate({ text: row.response, max: 120 })}</span>
      ) : (
        <span className={shared.cellMuted}>—</span>
      ),
  },
];

function kindLabel({ kind }: { kind: ResearchProjectInteractionKind }): string {
  switch (kind) {
    case "question":
      return "Question";
    case "baseline_confirmation":
      return "Baseline confirmation";
    case "decision":
      return "Decision";
  }
}

function statusLabel({ status }: { status: ResearchProjectInteractionStatus }): string {
  switch (status) {
    case "pending":
      return "Pending";
    case "answered":
      return "Answered";
    case "confirmed":
      return "Confirmed";
    case "rejected":
      return "Rejected";
    case "canceled":
      return "Canceled";
  }
}

function truncate({ text, max }: { text: string; max: number }): string {
  if (text.length <= max) return text;
  return `${text.slice(0, max - 1).trimEnd()}…`;
}
