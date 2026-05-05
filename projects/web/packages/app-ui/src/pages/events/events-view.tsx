import type { EventRecord } from "@situ/protocol";
import { DxBadge, DxEmptyState, DxTable, type DxTableColumn } from "@situ/web-ui";

export function EventsView({ events }: { events: EventRecord[] }) {
  if (events.length === 0) {
    return <DxEmptyState heading="No events yet" description="Events will appear here." />;
  }

  return (
    <div style={{ display: "grid", gap: 16 }}>
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
    renderCell: ({ row }) => <Mono>{row.created_at}</Mono>,
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
    renderCell: ({ row }) => (
      <span style={{ color: "var(--muted-foreground)" }}>{row.message}</span>
    ),
  },
];

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
