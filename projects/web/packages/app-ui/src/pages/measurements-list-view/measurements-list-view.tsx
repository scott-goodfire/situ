import { DxSection, DxTable, DxTime, mono, type DxTableColumn } from "@situ/web-ui";
import type { MeasurementRecord } from "../../domain/records";
import { markdownModule } from "../../modules/markdown";
import * as s from "../../styles.css";

export function MeasurementsListView({ measurements }: { measurements: MeasurementRecord[] }) {
  return (
    <DxSection title="Measurements">
      <DxTable
        columns={measurementColumns}
        rows={measurements}
        getRowKey={({ row }) => row.id}
        emptyLabel="No measurements yet"
        density="compact"
        stickyHeader
        sortable
      />
    </DxSection>
  );
}

const measurementColumns: Array<DxTableColumn<MeasurementRecord>> = [
  {
    id: "id",
    header: "Measurement",
    width: "120px",
    renderCell: ({ row }) => <span className={mono}>{row.id}</span>,
    sortValue: ({ row }) => row.id,
  },
  {
    id: "actor",
    header: "Actor",
    width: "140px",
    renderCell: ({ row }) => <span className={mono}>{row.actor}</span>,
    sortValue: ({ row }) => row.actor,
  },
  {
    id: "evaluation",
    header: "Evaluation",
    width: "200px",
    renderCell: ({ row }) =>
      row.evaluationId ? (
        <span className={mono}>{row.evaluationId}</span>
      ) : (
        <span className={s.cellMuted}>—</span>
      ),
    sortValue: ({ row }) => row.evaluationId ?? "",
  },
  {
    id: "body",
    header: "Body",
    renderCell: ({ row }) => (
      <span className={s.cellMuted}>{markdownModule.strip(row.body, { maxLength: 200 })}</span>
    ),
  },
  {
    id: "created",
    header: "Created",
    width: "180px",
    renderCell: ({ row }) => <DxTime iso={row.createdAt} className={mono} />,
    sortValue: ({ row }) => row.createdAt,
  },
];
