import { DxBadge, DxSection, DxTable, DxTime, mono, type DxTableColumn } from "@situ/web-ui";
import type { EvaluationRecord } from "../../domain/records";
import { markdownModule } from "../../modules/markdown";
import { researchStatusTone } from "../../__shared__";
import * as s from "../../styles.css";

export function EvaluationsListView({ evaluations }: { evaluations: EvaluationRecord[] }) {
  return (
    <DxSection title="Evaluations">
      <DxTable
        columns={evaluationColumns}
        rows={evaluations}
        getRowKey={({ row }) => row.id}
        emptyLabel="No evaluations yet"
        density="compact"
        stickyHeader
        sortable
      />
    </DxSection>
  );
}

const evaluationColumns: Array<DxTableColumn<EvaluationRecord>> = [
  {
    id: "title",
    header: "Evaluation",
    width: "30%",
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
    id: "baseline",
    header: "Baseline",
    width: "120px",
    renderCell: ({ row }) =>
      row.associatedBaselineId ? (
        <span className={mono}>{row.associatedBaselineId.slice(0, 12)}…</span>
      ) : (
        <span className={s.cellMuted}>—</span>
      ),
    sortValue: ({ row }) => row.associatedBaselineId ?? "",
  },
  {
    id: "updated",
    header: "Updated",
    width: "180px",
    renderCell: ({ row }) => <DxTime iso={row.updatedAt} className={mono} />,
    sortValue: ({ row }) => row.updatedAt,
  },
];
