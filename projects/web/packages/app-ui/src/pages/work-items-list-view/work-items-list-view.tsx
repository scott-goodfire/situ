import { DxBadge, DxSection, DxTable, DxTime, mono, type DxTableColumn } from "@situ/web-ui";
import type { WorkItemRecord } from "../../domain/records";
import * as s from "../../styles.css";

export function WorkItemsListView({ workItems }: { workItems: WorkItemRecord[] }) {
  return (
    <DxSection title="Work items">
      <DxTable
        columns={workItemColumns}
        rows={workItems}
        getRowKey={({ row }) => row.id}
        emptyLabel="No work items yet"
        density="compact"
        stickyHeader
        sortable
      />
    </DxSection>
  );
}

const workItemColumns: Array<DxTableColumn<WorkItemRecord>> = [
  {
    id: "id",
    header: "Work item",
    width: "120px",
    renderCell: ({ row }) => <span className={mono}>{row.id}</span>,
    sortValue: ({ row }) => row.id,
  },
  {
    id: "purpose",
    header: "Purpose",
    width: "200px",
    renderCell: ({ row }) => <span className={s.cellTitle}>{row.purpose}</span>,
    sortValue: ({ row }) => row.purpose,
  },
  {
    id: "target",
    header: "Target",
    renderCell: ({ row }) => (
      <span className={s.cellMuted}>
        <span className={mono}>{row.targetKind}</span>
        {" · "}
        <span className={mono}>{row.targetId}</span>
      </span>
    ),
    sortValue: ({ row }) => `${row.targetKind}/${row.targetId}`,
  },
  {
    id: "status",
    header: "Status",
    width: "120px",
    renderCell: ({ row }) => <DxBadge>{row.status}</DxBadge>,
    sortValue: ({ row }) => row.status,
  },
  {
    id: "owner",
    header: "Owner",
    width: "180px",
    renderCell: ({ row }) =>
      row.ownerAgentId ? (
        <span className={mono}>{row.ownerAgentId}</span>
      ) : (
        <span className={s.cellMuted}>—</span>
      ),
    sortValue: ({ row }) => row.ownerAgentId ?? "",
  },
  {
    id: "attempt",
    header: "Attempt",
    width: "80px",
    renderCell: ({ row }) => <span className={mono}>{row.attempt}</span>,
    sortValue: ({ row }) => row.attempt,
  },
  {
    id: "updated",
    header: "Updated",
    width: "180px",
    renderCell: ({ row }) => <DxTime iso={row.updatedAt} className={mono} />,
    sortValue: ({ row }) => row.updatedAt,
  },
];
