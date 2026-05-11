import { DxBadge, DxSection, DxTable, DxTime, mono, type DxTableColumn } from "@situ/web-ui";
import type { ArtifactRecord } from "../../domain/records";
import * as s from "../../styles.css";

export function ArtifactsListView({ artifacts }: { artifacts: ArtifactRecord[] }) {
  return (
    <DxSection title="Artifacts">
      <DxTable
        columns={artifactColumns}
        rows={artifacts}
        getRowKey={({ row }) => row.id}
        emptyLabel="No artifacts yet"
        density="compact"
        stickyHeader
        sortable
      />
    </DxSection>
  );
}

const artifactColumns: Array<DxTableColumn<ArtifactRecord>> = [
  {
    id: "id",
    header: "Artifact",
    width: "120px",
    renderCell: ({ row }) => <span className={mono}>{row.id}</span>,
    sortValue: ({ row }) => row.id,
  },
  {
    id: "kind",
    header: "Kind",
    width: "120px",
    renderCell: ({ row }) => <DxBadge>{row.kind}</DxBadge>,
    sortValue: ({ row }) => row.kind,
  },
  {
    id: "title",
    header: "Title",
    width: "30%",
    renderCell: ({ row }) => <span className={s.cellTitle}>{row.title}</span>,
    sortValue: ({ row }) => row.title,
  },
  {
    id: "path",
    header: "Path",
    renderCell: ({ row }) => <span className={mono}>{row.path}</span>,
    sortValue: ({ row }) => row.path,
  },
  {
    id: "size",
    header: "Size",
    width: "120px",
    renderCell: ({ row }) =>
      row.sizeBytes !== null ? (
        <span className={mono}>{formatBytes({ bytes: row.sizeBytes })}</span>
      ) : (
        <span className={s.cellMuted}>—</span>
      ),
    sortValue: ({ row }) => row.sizeBytes ?? 0,
  },
  {
    id: "created",
    header: "Created",
    width: "180px",
    renderCell: ({ row }) => <DxTime iso={row.createdAt} className={mono} />,
    sortValue: ({ row }) => row.createdAt,
  },
];

function formatBytes({ bytes }: { bytes: number }): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  if (bytes < 1024 * 1024 * 1024) return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
  return `${(bytes / 1024 / 1024 / 1024).toFixed(1)} GB`;
}
