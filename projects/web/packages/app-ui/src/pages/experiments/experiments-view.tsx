import type { ExperimentRecord } from "@situ/protocol";
import { DxBadge, DxEmptyState, DxTable, type DxTableColumn } from "@situ/web-ui";

export function ExperimentsView({
  experiments,
}: {
  experiments: ExperimentRecord[];
}) {
  if (experiments.length === 0) {
    return <DxEmptyState heading="No experiments yet" description="Experiments will appear here." />;
  }

  return (
    <div style={{ display: "grid", gap: 16 }}>
      <PageHeader title="Experiments" count={experiments.length} />
      <DxTable
        columns={columns}
        rows={experiments}
        getRowKey={({ row }) => row.id}
        emptyLabel="No experiments"
        density="compact"
        sortable
      />
    </div>
  );
}

const columns: Array<DxTableColumn<ExperimentRecord>> = [
  {
    id: "id",
    header: "ID",
    width: "120px",
    renderCell: ({ row }) => (
      <span
        style={{
          fontFamily: "var(--font-mono)",
          fontSize: "var(--text-product-sm)",
          color: "var(--muted-foreground-tertiary)",
        }}
      >
        {row.id}
      </span>
    ),
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
    id: "summary",
    header: "Summary",
    renderCell: ({ row }) => (
      <span style={{ color: "var(--muted-foreground)" }}>{row.summary}</span>
    ),
  },
];

function StatusBadge({ status }: { status: ExperimentRecord["status"] }) {
  if (status === "active") return <DxBadge tone="success">active</DxBadge>;
  if (status === "open") return <DxBadge tone="warning">open</DxBadge>;
  return <DxBadge>closed</DxBadge>;
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
