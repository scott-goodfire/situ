import { DxBadge, DxSection, DxTable, DxTime, mono, type DxTableColumn } from "@situ/web-ui";
import type { ExperimentRecord } from "../../domain/records";
import { markdownModule } from "../../modules/markdown";
import { researchStatusTone } from "../../__shared__";
import * as s from "../../styles.css";

export function ExperimentsListView({ experiments }: { experiments: ExperimentRecord[] }) {
  return (
    <DxSection title="Experiments">
      <DxTable
        columns={experimentColumns}
        rows={experiments}
        getRowKey={({ row }) => row.id}
        emptyLabel="No experiments yet"
        density="compact"
        stickyHeader
        sortable
      />
    </DxSection>
  );
}

const experimentColumns: Array<DxTableColumn<ExperimentRecord>> = [
  {
    id: "title",
    header: "Experiment",
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
    id: "candidate",
    header: "Candidate",
    width: "140px",
    renderCell: ({ row }) =>
      row.candidateCommit ? (
        <span className={mono}>{row.candidateCommit.slice(0, 7)}</span>
      ) : (
        <span className={s.cellMuted}>—</span>
      ),
    sortValue: ({ row }) => row.candidateCommit ?? "",
  },
  {
    id: "updated",
    header: "Updated",
    width: "180px",
    renderCell: ({ row }) => <DxTime iso={row.updatedAt} className={mono} />,
    sortValue: ({ row }) => row.updatedAt,
  },
];
