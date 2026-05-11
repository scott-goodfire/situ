import { AgentsListView } from "@situ/web-app-ui";
import { useAgents } from "../../hooks/agents";

export function AgentsListPage() {
  return <AgentsListView agents={useAgents()} />;
}
