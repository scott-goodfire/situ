import { AgentsPageView } from "@situ/web-app-ui";
import { agentsForProject } from "../../../selectors/agents";
import type { ProjectWorkspaceData } from "../types";
import { projectRouteParams, recordLink } from "../view-adapters";

export function AgentsPage({ data }: { data: ProjectWorkspaceData }) {
  const params = projectRouteParams({ data });

  return (
    <AgentsPageView
      rows={agentsForProject({ data }).map((agent) => ({
        agent,
        title: recordLink({
          to: "/workspaces/$workspaceId/projects/$projectId/agents/$agentId",
          params: { ...params, agentId: agent.id },
          children: agent.display_name,
        }),
      }))}
    />
  );
}
