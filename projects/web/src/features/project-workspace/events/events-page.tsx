import type { EventRecord } from "@almanac/protocol";
import { DxSection, DxTable, type DxTableColumn, type DxTableRowTone } from "@almanac/web-ui";
import { DateTime } from "luxon";
import type { ProjectWorkspaceData } from "../types";

export function EventsPage({ data }: { data: ProjectWorkspaceData }) {
  return (
    <DxSection title="Events">
      <DxTable
        columns={eventColumns}
        rows={data.events}
        getRowKey={({ row }) => String(row.id)}
        emptyLabel="No events yet"
        density="compact"
        stickyHeader
        sortable
        maxHeight="640px"
        getRowTone={eventRowTone}
      />
    </DxSection>
  );
}

const eventColumns: Array<DxTableColumn<EventRecord>> = [
  {
    id: "id",
    header: "Event",
    width: "90px",
    renderCell: ({ row }) => <span className="dx-mono">#{row.id}</span>,
    sortValue: ({ row }) => row.id,
  },
  {
    id: "type",
    header: "Type",
    width: "220px",
    renderCell: ({ row }) => row.type,
    sortValue: ({ row }) => row.type,
  },
  {
    id: "message",
    header: "Message",
    renderCell: ({ row }) => row.message,
  },
  {
    id: "created",
    header: "Created",
    width: "190px",
    renderCell: ({ row }) => (
      <span className="dx-mono">{formatTime({ value: row.created_at })}</span>
    ),
    sortValue: ({ row }) => row.created_at,
  },
];

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

function formatTime({ value }: { value: string }): string {
  return DateTime.fromISO(value).toLocaleString(DateTime.DATETIME_MED_WITH_SECONDS);
}
