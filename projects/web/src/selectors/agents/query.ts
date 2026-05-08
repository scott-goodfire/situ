import type { AgentRecord } from "@situ/protocol";
import filter from "lodash/filter";
import type { ProjectWorkspaceData } from "../../features/project-workspace/types";

export function agentsForProject({
  data,
}: {
  data: ProjectWorkspaceData;
}): AgentRecord[] {
  const projectId = data.activeProjectRecordId ?? data.projectId;

  return filter(data.agents, (agent) => agent.project_id === projectId);
}
