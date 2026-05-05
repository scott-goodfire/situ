import { DxBadge } from "@situ/web-ui";
import { agentSummaries } from "./agent-summaries";
import { AgentPresence } from "./presence/agent-presence";
import { AgentTranscript } from "./transcript/agent-transcript";
import { agentTranscriptItems } from "./transcript/selectors";
import type { ProjectWorkspaceData } from "../types";

export function AgentDetailPage({
  data,
  agentId,
}: {
  data: ProjectWorkspaceData;
  agentId: string;
}) {
  const agent = agentSummaries({ data }).find((summary) => summary.id === agentId);

  if (!agent) {
    return (
      <section className="situ-empty">
        <h2>Agent not found</h2>
        <p>No activity exists for agent {agentId}.</p>
      </section>
    );
  }

  const transcriptItems = agentTranscriptItems({
    data,
    agentId,
  });
  const latestItem = transcriptItems.at(-1);

  return (
    <>
      <section className="situ-object-page">
        <div className="situ-object-page__header">
          <div>
            <p className="situ-object-page__eyebrow">Agent</p>
            <h2>{agent.id}</h2>
          </div>
          <DxBadge>{activityCountLabel({ count: transcriptItems.length })}</DxBadge>
        </div>
        <AgentPresence
          agentIds={[agent.id]}
          detail={latestItem ? latestItem.title.toLowerCase() : undefined}
        />
      </section>

      <AgentTranscript projectId={data.projectId} items={transcriptItems} />
    </>
  );
}

function activityCountLabel({
  count,
}: {
  count: number;
}): string {
  if (count === 1) {
    return "1 activity";
  }

  return `${count} activities`;
}
