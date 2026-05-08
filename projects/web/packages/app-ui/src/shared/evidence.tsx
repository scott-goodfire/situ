import { DxBadge, DxSection, DxTable, DxTime, mono, type DxBadgeTone, type DxTableColumn, type DxTableRowTone } from "@situ/web-ui";
import type { ReactNode } from "react";
import { MarkdownText } from "./markdown-text";
import * as s from "../styles.css";

export type EvidenceSummaryModel = {
  label: ReactNode;
  tone: DxBadgeTone;
  body: ReactNode;
};

export function EvidenceSummaryView({ evidence }: { evidence: EvidenceSummaryModel }) {
  return (
    <div className={s.evidenceSummary}>
      <DxBadge tone={evidence.tone}>{evidence.label}</DxBadge>
      <MarkdownText value={evidence.body} variant="inline" className={s.evidenceSummaryText} />
    </div>
  );
}

export type EvaluationActivityListRow = {
  id: string;
  title: ReactNode;
  titleSort: string;
  status: ReactNode;
  statusSort: string;
  latest: ReactNode;
  updatedAt: string;
  rowTone?: DxTableRowTone;
};

export function EvaluationActivityListView({
  title,
  rows,
  emptyLabel,
}: {
  title: string;
  rows: EvaluationActivityListRow[];
  emptyLabel: string;
}) {
  return (
    <DxSection title={title}>
      <DxTable
        columns={evaluationColumns}
        rows={rows}
        getRowKey={({ row }) => row.id}
        emptyLabel={emptyLabel}
        density="compact"
        stickyHeader
        sortable
        getRowTone={({ row }) => row.rowTone ?? "neutral"}
      />
    </DxSection>
  );
}

const evaluationColumns: Array<DxTableColumn<EvaluationActivityListRow>> = [
  {
    id: "evaluation",
    header: "Evaluation",
    width: "28%",
    renderCell: ({ row }) => row.title,
    sortValue: ({ row }) => row.titleSort,
  },
  {
    id: "status",
    header: "Status",
    width: "110px",
    renderCell: ({ row }) => row.status,
    sortValue: ({ row }) => row.statusSort,
  },
  {
    id: "latest",
    header: "Latest Evidence",
    renderCell: ({ row }) => <MarkdownText value={row.latest} variant="inline" />,
  },
  {
    id: "updated",
    header: "Updated",
    width: "190px",
    renderCell: ({ row }) => <DxTime iso={row.updatedAt} className={mono} />,
    sortValue: ({ row }) => row.updatedAt,
  },
];
