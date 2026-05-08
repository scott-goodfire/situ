import { AgentDetailView } from "@situ/web-app-ui";
import { agentTranscriptItems } from "../../../selectors/agents";
import type { ProjectWorkspaceData } from "../types";
import { transcriptItemView } from "../view-adapters";

export function AgentDetailPage({
  data,
  agentId,
}: {
  data: ProjectWorkspaceData;
  agentId: string;
}) {
  const agent = data.agents.find((record) => record.id === agentId);
  const transcriptItems = agentTranscriptItems({ data, agentId });
  const latestItem = transcriptItems.at(-1);

  return (
    <AgentDetailView
      agent={agent}
      presenceDetail={
        latestItem ? latestItem.title.toLowerCase() : activityCountLabel({ count: transcriptItems.length })
      }
      transcriptItems={transcriptItems.map((item) => transcriptItemView({ item, data }))}
    />
  );
}

function activityCountLabel({ count }: { count: number }): string {
  if (count === 1) return "1 activity";
  return `${count} activities`;
}
