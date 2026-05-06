import type { AnalysisRecord } from "@situ/protocol";
import { DxBadge, DxSection, DxTable, type DxBadgeTone, type DxTableColumn } from "@situ/web-ui";
import { Link } from "@tanstack/react-router";
import * as s from "../../../styles.css";
import type { ProjectWorkspaceData } from "../types";

export function AnalysesPage({ data }: { data: ProjectWorkspaceData }) {
  const analyses = data.analyses.filter(
    (analysis) => analysis.project_id === data.projectId,
  );
  const columns = analysisColumns({ projectId: data.projectId });

  return (
    <DxSection title="Analyses">
      <DxTable
        columns={columns}
        rows={analyses}
        getRowKey={({ row }) => row.id}
        emptyLabel="No analyses yet"
        density="compact"
        stickyHeader
        sortable
      />
    </DxSection>
  );
}

function analysisColumns({
  projectId,
}: {
  projectId: string;
}): Array<DxTableColumn<AnalysisRecord>> {
  return [
    {
      id: "analysis",
      header: "Analysis",
      width: "32%",
      renderCell: ({ row }) => (
        <div className={s.recordCell}>
          <Link
            className={s.recordLink}
            to="/projects/$projectId/analyses/$analysisId"
            params={{ projectId, analysisId: row.id }}
          >
            {row.title}
          </Link>
          <span className={s.recordId}>{row.id}</span>
        </div>
      ),
      sortValue: ({ row }) => row.title,
    },
    {
      id: "status",
      header: "Status",
      width: "110px",
      renderCell: ({ row }) => (
        <DxBadge tone={statusTone({ status: row.status })}>{row.status}</DxBadge>
      ),
      sortValue: ({ row }) => row.status,
    },
    {
      id: "summary",
      header: "Summary",
      renderCell: ({ row }) => <span className={s.recordCell}>{row.summary}</span>,
    },
  ];
}

function statusTone({ status }: { status: AnalysisRecord["status"] }): DxBadgeTone {
  if (status === "active") return "success";
  if (status === "closed") return "neutral";
  return "warning";
}
