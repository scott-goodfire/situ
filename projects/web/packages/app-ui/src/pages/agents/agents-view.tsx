import { DxBadge, DxEmptyState, DxTable, type DxTableColumn } from "@situ/web-ui";

export type AgentRow = {
  id: string;
  name: string;
  role: string;
  status: "idle" | "active" | "offline";
};

export function AgentsView({ agents }: { agents: AgentRow[] }) {
  if (agents.length === 0) {
    return <DxEmptyState heading="No agents yet" description="Active agents will appear here." />;
  }

  return (
    <div style={{ display: "grid", gap: 16 }}>
      <PageHeader title="Agents" count={agents.length} />
      <DxTable
        columns={columns}
        rows={agents}
        getRowKey={({ row }) => row.id}
        emptyLabel="No agents"
        density="compact"
        sortable
      />
    </div>
  );
}

const columns: Array<DxTableColumn<AgentRow>> = [
  {
    id: "id",
    header: "ID",
    width: "140px",
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
    id: "name",
    header: "Name",
    renderCell: ({ row }) => <span style={{ fontWeight: 500 }}>{row.name}</span>,
    sortValue: ({ row }) => row.name,
  },
  {
    id: "role",
    header: "Role",
    width: "140px",
    renderCell: ({ row }) => (
      <span style={{ color: "var(--muted-foreground)" }}>{row.role}</span>
    ),
    sortValue: ({ row }) => row.role,
  },
  {
    id: "status",
    header: "Status",
    width: "110px",
    renderCell: ({ row }) => <StatusBadge status={row.status} />,
    sortValue: ({ row }) => row.status,
  },
];

function StatusBadge({ status }: { status: AgentRow["status"] }) {
  if (status === "active") {
    return (
      <DxBadge tone="success" withDot>
        active
      </DxBadge>
    );
  }
  if (status === "idle") return <DxBadge>idle</DxBadge>;
  return <DxBadge tone="danger">offline</DxBadge>;
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
