import { DxBadge, DxSection, DxTable, DxTime, mono, type DxTableColumn } from "@situ/web-ui";
import type { ClaudeAgentRecord } from "../../domain/records";
import * as s from "../../styles.css";

export function AgentsListView({ agents }: { agents: ClaudeAgentRecord[] }) {
  return (
    <DxSection title="Agents">
      <DxTable
        columns={agentColumns}
        rows={agents}
        getRowKey={({ row }) => row.id}
        emptyLabel="No agents yet"
        density="compact"
        stickyHeader
        sortable
      />
    </DxSection>
  );
}

const agentColumns: Array<DxTableColumn<ClaudeAgentRecord>> = [
  {
    id: "id",
    header: "Agent",
    width: "180px",
    renderCell: ({ row }) => <span className={mono}>{row.id}</span>,
    sortValue: ({ row }) => row.id,
  },
  {
    id: "kind",
    header: "Kind",
    width: "120px",
    renderCell: ({ row }) => <DxBadge>{row.kind}</DxBadge>,
    sortValue: ({ row }) => row.kind,
  },
  {
    id: "displayName",
    header: "Display name",
    renderCell: ({ row }) => <span className={s.cellTitle}>{row.displayName}</span>,
    sortValue: ({ row }) => row.displayName,
  },
  {
    id: "model",
    header: "Model",
    width: "200px",
    renderCell: ({ row }) =>
      row.model ? (
        <span className={mono}>{row.model}</span>
      ) : (
        <span className={s.cellMuted}>—</span>
      ),
    sortValue: ({ row }) => row.model ?? "",
  },
  {
    id: "status",
    header: "Status",
    width: "100px",
    renderCell: ({ row }) => <DxBadge>{row.status}</DxBadge>,
    sortValue: ({ row }) => row.status,
  },
  {
    id: "updated",
    header: "Updated",
    width: "180px",
    renderCell: ({ row }) => <DxTime iso={row.updatedAt} className={mono} />,
    sortValue: ({ row }) => row.updatedAt,
  },
];
