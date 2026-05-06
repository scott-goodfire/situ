import type { EventRecord } from "@situ/protocol";
import { DxBadge, DxEmptyState, DxTable, type DxTableColumn } from "@situ/web-ui";
import * as s from "../../styles.css";

export function EventsView({ events }: { events: EventRecord[] }) {
  if (events.length === 0) {
    return <DxEmptyState heading="No events yet" description="Events will appear here." />;
  }

  return (
    <div className={s.viewStack}>
      <PageHeader title="Events" count={events.length} />
      <DxTable
        columns={columns}
        rows={events}
        getRowKey={({ row }) => String(row.id)}
        emptyLabel="No events"
        density="compact"
        sortable
      />
    </div>
  );
}

const columns: Array<DxTableColumn<EventRecord>> = [
  {
    id: "time",
    header: "Time",
    width: "180px",
    renderCell: ({ row }) => <span className={s.monoTertiary}>{row.created_at}</span>,
    sortValue: ({ row }) => row.created_at,
  },
  {
    id: "type",
    header: "Type",
    width: "160px",
    renderCell: ({ row }) => <DxBadge>{row.type}</DxBadge>,
    sortValue: ({ row }) => row.type,
  },
  {
    id: "message",
    header: "Message",
    renderCell: ({ row }) => <span className={s.cellMuted}>{row.message}</span>,
  },
];

function PageHeader({ title, count }: { title: string; count: number }) {
  return (
    <header className={s.pageHeader}>
      <h1 className={s.pageHeaderTitle}>{title}</h1>
      <DxBadge>{count}</DxBadge>
    </header>
  );
}
