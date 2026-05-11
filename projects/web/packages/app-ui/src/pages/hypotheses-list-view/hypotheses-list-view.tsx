import { DxBadge, DxSection, DxTable, DxTime, mono, type DxTableColumn } from "@situ/web-ui";
import type { HypothesisRecord } from "../../domain/records";
import { markdownModule } from "../../modules/markdown";
import { researchStatusTone } from "../../__shared__";
import * as s from "../../styles.css";

export function HypothesesListView({ hypotheses }: { hypotheses: HypothesisRecord[] }) {
  return (
    <DxSection title="Hypotheses">
      <DxTable
        columns={hypothesisColumns}
        rows={hypotheses}
        getRowKey={({ row }) => row.id}
        emptyLabel="No hypotheses yet"
        density="compact"
        stickyHeader
        sortable
      />
    </DxSection>
  );
}

const hypothesisColumns: Array<DxTableColumn<HypothesisRecord>> = [
  {
    id: "title",
    header: "Hypothesis",
    width: "32%",
    renderCell: ({ row }) => <span className={s.cellTitle}>{row.title}</span>,
    sortValue: ({ row }) => row.title,
  },
  {
    id: "status",
    header: "Status",
    width: "120px",
    renderCell: ({ row }) => (
      <DxBadge tone={researchStatusTone({ status: row.status })}>{row.status}</DxBadge>
    ),
    sortValue: ({ row }) => row.status,
  },
  {
    id: "summary",
    header: "Summary",
    renderCell: ({ row }) => (
      <span className={s.cellMuted}>{markdownModule.strip(row.summary, { maxLength: 200 })}</span>
    ),
  },
  {
    id: "updated",
    header: "Updated",
    width: "180px",
    renderCell: ({ row }) => <DxTime iso={row.updatedAt} className={mono} />,
    sortValue: ({ row }) => row.updatedAt,
  },
];
