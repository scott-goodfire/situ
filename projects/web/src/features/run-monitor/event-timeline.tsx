import type { EventRecord } from "@almanac/protocol";
import { DxSection, DxTable, type DxTableColumn } from "@almanac/web-ui";

const eventColumns: Array<DxTableColumn<EventRecord>> = [
  {
    id: "id",
    header: "Event",
    width: "90px",
    renderCell: ({ row: event }) => <span className="dx-mono">#{event.id}</span>,
  },
  {
    id: "type",
    header: "Type",
    width: "220px",
    renderCell: ({ row: event }) => event.type,
  },
  {
    id: "message",
    header: "Message",
    renderCell: ({ row: event }) => event.message,
  },
];

export function EventTimeline({ events }: { events: EventRecord[] }) {
  const visibleEvents = events.slice(-14);

  return (
    <DxSection title="Timeline">
      <DxTable
        columns={eventColumns}
        rows={visibleEvents}
        getRowKey={({ row: event }) => `${event.id}`}
        emptyLabel="No events yet"
      />
    </DxSection>
  );
}
