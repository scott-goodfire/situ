import type { EventRecord } from "@situ/protocol";
import {
  DxSection,
  DxTable,
  type DxTableColumn,
  type DxTableRowTone,
} from "@situ/web-ui";

const eventColumns: Array<DxTableColumn<EventRecord>> = [
  {
    id: "id",
    header: "Event",
    width: "90px",
    renderCell: ({ row: event }) => <span className="dx-mono">#{event.id}</span>,
    sortValue: ({ row: event }) => event.id,
  },
  {
    id: "type",
    header: "Type",
    width: "220px",
    renderCell: ({ row: event }) => event.type,
    sortValue: ({ row: event }) => event.type,
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
        density="compact"
        maxHeight="360px"
        stickyHeader
        animateRows
        autoScroll
        getRowTone={eventRowTone}
      />
    </DxSection>
  );
}

function eventRowTone({ row: event }: { row: EventRecord }): DxTableRowTone {
  const searchableText = `${event.type} ${event.message}`.toLowerCase();

  if (searchableText.includes("failed") || searchableText.includes("error")) {
    return "danger";
  }

  if (searchableText.includes("concern") || searchableText.includes("suspicious")) {
    return "warning";
  }

  return "neutral";
}
