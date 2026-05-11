import { DxBadge, DxSection, DxTable, mono, type DxTableColumn } from "@situ/web-ui";
import type { EntityLinkRecord } from "../../domain/records";

export function EntityLinksListView({ entityLinks }: { entityLinks: EntityLinkRecord[] }) {
  return (
    <DxSection title="Entity links">
      <DxTable
        columns={entityLinkColumns}
        rows={entityLinks}
        getRowKey={({ row }) => row.id}
        emptyLabel="No entity links yet"
        density="compact"
        stickyHeader
        sortable
      />
    </DxSection>
  );
}

const entityLinkColumns: Array<DxTableColumn<EntityLinkRecord>> = [
  {
    id: "id",
    header: "Link",
    width: "120px",
    renderCell: ({ row }) => <span className={mono}>{row.id}</span>,
    sortValue: ({ row }) => row.id,
  },
  {
    id: "from",
    header: "From",
    renderCell: ({ row }) => (
      <>
        <DxBadge>{row.fromKind}</DxBadge> <span className={mono}>{row.fromId}</span>
      </>
    ),
    sortValue: ({ row }) => `${row.fromKind}/${row.fromId}`,
  },
  {
    id: "relationship",
    header: "Relationship",
    width: "180px",
    renderCell: ({ row }) => <span className={mono}>{row.relationship}</span>,
    sortValue: ({ row }) => row.relationship,
  },
  {
    id: "to",
    header: "To",
    renderCell: ({ row }) => (
      <>
        <DxBadge>{row.toKind}</DxBadge> <span className={mono}>{row.toId}</span>
      </>
    ),
    sortValue: ({ row }) => `${row.toKind}/${row.toId}`,
  },
];
