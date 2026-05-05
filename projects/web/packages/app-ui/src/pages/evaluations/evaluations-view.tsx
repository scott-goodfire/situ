import type { EvaluationRecord } from "@situ/protocol";
import { DxBadge, DxEmptyState, DxTable, type DxTableColumn } from "@situ/web-ui";

export function EvaluationsView({
  evaluations,
}: {
  evaluations: EvaluationRecord[];
}) {
  if (evaluations.length === 0) {
    return <DxEmptyState heading="No evaluations yet" description="Evaluations will appear here." />;
  }

  return (
    <div style={{ display: "grid", gap: 16 }}>
      <PageHeader title="Evaluations" count={evaluations.length} />
      <DxTable
        columns={columns}
        rows={evaluations}
        getRowKey={({ row }) => row.id}
        emptyLabel="No evaluations"
        density="compact"
        sortable
      />
    </div>
  );
}

const columns: Array<DxTableColumn<EvaluationRecord>> = [
  {
    id: "id",
    header: "ID",
    width: "120px",
    renderCell: ({ row }) => <Mono>{row.id}</Mono>,
    sortValue: ({ row }) => row.id,
  },
  {
    id: "title",
    header: "Title",
    renderCell: ({ row }) => <span style={{ fontWeight: 500 }}>{row.title}</span>,
    sortValue: ({ row }) => row.title,
  },
  {
    id: "status",
    header: "Status",
    width: "110px",
    renderCell: ({ row }) => <StatusBadge status={row.status} />,
    sortValue: ({ row }) => row.status,
  },
  {
    id: "experiment",
    header: "Experiment",
    width: "140px",
    renderCell: ({ row }) => (
      <Mono>{row.associated_experiment_id ?? "—"}</Mono>
    ),
    sortValue: ({ row }) => row.associated_experiment_id ?? "",
  },
  {
    id: "summary",
    header: "Summary",
    renderCell: ({ row }) => (
      <span style={{ color: "var(--muted-foreground)" }}>{row.summary}</span>
    ),
  },
];

function StatusBadge({ status }: { status: EvaluationRecord["status"] }) {
  if (status === "active") return <DxBadge tone="success">active</DxBadge>;
  if (status === "open") return <DxBadge tone="warning">open</DxBadge>;
  return <DxBadge>closed</DxBadge>;
}

function Mono({ children }: { children: React.ReactNode }) {
  return (
    <span
      style={{
        fontFamily: "var(--font-mono)",
        fontSize: "var(--text-product-sm)",
        color: "var(--muted-foreground-tertiary)",
      }}
    >
      {children}
    </span>
  );
}

function PageHeader({ title, count }: { title: string; count: number }) {
  return (
    <header style={{ display: "flex", alignItems: "baseline", justifyContent: "space-between" }}>
      <h1
        style={{
          margin: 0,
          fontSize: "var(--text-display-md)",
          fontWeight: 500,
          letterSpacing: "var(--tracking-display)",
        }}
      >
        {title}
      </h1>
      <DxBadge>{count}</DxBadge>
    </header>
  );
}
