import { DxSection, DxTable, type DxTableColumn } from "@situ/web-ui";
import { Link } from "@tanstack/react-router";
import { DateTime } from "luxon";
import type { AgentSummary, ProjectWorkspaceData } from "../types";
import { agentSummaries } from "./agent-summaries";

export function AgentsPage({ data }: { data: ProjectWorkspaceData }) {
  const agents = agentSummaries({ data });
  const columns = agentColumns({ projectId: data.projectId });

  return (
    <DxSection title="Agents">
      <DxTable
        columns={columns}
        rows={agents}
        getRowKey={({ row }) => row.id}
        emptyLabel="No agent activity yet"
        density="compact"
        stickyHeader
        sortable
      />
    </DxSection>
  );
}

function agentColumns({
  projectId,
}: {
  projectId: string;
}): Array<DxTableColumn<AgentSummary>> {
  return [
    {
      id: "agent",
      header: "Agent",
      width: "30%",
      renderCell: ({ row }) => (
        <Link
          className="situ-record-link"
          to="/projects/$projectId/agents/$agentId"
          params={{
            projectId,
            agentId: row.id,
          }}
        >
          {row.id}
        </Link>
      ),
      sortValue: ({ row }) => row.id,
    },
    {
      id: "hypotheses",
      header: "Hypothesis Activity",
      width: "180px",
      renderCell: ({ row }) => <span className="dx-mono">{row.hypothesisActivityCount}</span>,
      sortValue: ({ row }) => row.hypothesisActivityCount,
    },
    {
      id: "experiments",
      header: "Experiment Activity",
      width: "180px",
      renderCell: ({ row }) => <span className="dx-mono">{row.experimentActivityCount}</span>,
      sortValue: ({ row }) => row.experimentActivityCount,
    },
    {
      id: "evaluations",
      header: "Evaluation Activity",
      width: "180px",
      renderCell: ({ row }) => <span className="dx-mono">{row.evaluationActivityCount}</span>,
      sortValue: ({ row }) => row.evaluationActivityCount,
    },
    {
      id: "latest",
      header: "Latest Activity",
      renderCell: ({ row }) => formatTime({ value: row.latestActivityAt }),
      sortValue: ({ row }) => row.latestActivityAt ?? "",
    },
  ];
}

function formatTime({ value }: { value: string | null }): string {
  if (!value) {
    return "never";
  }

  return DateTime.fromISO(value).toLocaleString(DateTime.DATETIME_MED_WITH_SECONDS);
}
