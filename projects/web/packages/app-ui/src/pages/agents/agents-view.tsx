import { DxBadge, DxEmptyState, DxTable, type DxTableColumn } from "@situ/web-ui";
import * as s from "../../styles.css";

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
    <div className={s.viewStack}>
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
    renderCell: ({ row }) => <span className={s.monoTertiary}>{row.id}</span>,
    sortValue: ({ row }) => row.id,
  },
  {
    id: "name",
    header: "Name",
    renderCell: ({ row }) => <span className={s.cellTitle}>{row.name}</span>,
    sortValue: ({ row }) => row.name,
  },
  {
    id: "role",
    header: "Role",
    width: "140px",
    renderCell: ({ row }) => <span className={s.cellMuted}>{row.role}</span>,
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
    <header className={s.pageHeader}>
      <h1 className={s.pageHeaderTitle}>{title}</h1>
      <DxBadge>{count}</DxBadge>
    </header>
  );
}
