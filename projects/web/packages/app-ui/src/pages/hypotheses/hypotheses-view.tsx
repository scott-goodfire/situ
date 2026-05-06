import type { HypothesisRecord } from "@situ/protocol";
import { DxBadge, DxEmptyState, DxTable, type DxTableColumn } from "@situ/web-ui";
import * as s from "../../styles.css";

export function HypothesesView({
  hypotheses,
}: {
  hypotheses: HypothesisRecord[];
}) {
  if (hypotheses.length === 0) {
    return <DxEmptyState heading="No hypotheses yet" description="Hypotheses will appear here." />;
  }

  return (
    <div className={s.viewStack}>
      <PageHeader title="Hypotheses" count={hypotheses.length} />
      <DxTable
        columns={columns}
        rows={hypotheses}
        getRowKey={({ row }) => row.id}
        emptyLabel="No hypotheses"
        density="compact"
        sortable
      />
    </div>
  );
}

const columns: Array<DxTableColumn<HypothesisRecord>> = [
  {
    id: "id",
    header: "ID",
    width: "120px",
    renderCell: ({ row }) => <span className={s.monoTertiary}>{row.id}</span>,
    sortValue: ({ row }) => row.id,
  },
  {
    id: "title",
    header: "Title",
    renderCell: ({ row }) => <span className={s.cellTitle}>{row.title}</span>,
    sortValue: ({ row }) => row.title,
  },
  {
    id: "status",
    header: "Status",
    width: "110px",
    renderCell: ({ row }) => <StatusBadge status={row.status} />,
    sortValue: ({ row }) => row.status,
  },
  {
    id: "summary",
    header: "Summary",
    renderCell: ({ row }) => <span className={s.cellMuted}>{row.summary}</span>,
  },
];

function StatusBadge({ status }: { status: HypothesisRecord["status"] }) {
  if (status === "active") return <DxBadge tone="success">active</DxBadge>;
  if (status === "open") return <DxBadge tone="warning">open</DxBadge>;
  return <DxBadge>closed</DxBadge>;
}

function PageHeader({ title, count }: { title: string; count: number }) {
  return (
    <header className={s.pageHeader}>
      <h1 className={s.pageHeaderTitle}>{title}</h1>
      <DxBadge>{count}</DxBadge>
    </header>
  );
}
