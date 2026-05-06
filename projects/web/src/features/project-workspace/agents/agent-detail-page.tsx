import { DxBadge, DxEmptyState } from "@situ/web-ui";
import * as s from "../../../styles.css";
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
  const agent = data.agents.find((record) => record.id === agentId);

  if (!agent) {
    return (
      <DxEmptyState
        heading="Agent not found"
        description={`No agent exists with id ${agentId}.`}
      />
    );
  }

  const transcriptItems = agentTranscriptItems({
    data,
    agentId,
  });
  const latestItem = transcriptItems.at(-1);

  return (
    <>
      <section className={s.objectPage}>
        <div className={s.objectPageHeader}>
          <div>
            <p className={s.objectPageEyebrow}>{agent.kind} · {agent.id}</p>
            <h2>{agent.display_name}</h2>
          </div>
          <DxBadge tone={agent.status === "active" ? "success" : "neutral"}>
            {agent.status}
          </DxBadge>
        </div>
        {agent.model_name && (
          <p className={s.objectPageSummary}>Model: {agent.model_name}</p>
        )}
        <AgentPresence
          agentIds={[agent.id]}
          detail={latestItem ? latestItem.title.toLowerCase() : activityCountLabel({ count: transcriptItems.length })}
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
