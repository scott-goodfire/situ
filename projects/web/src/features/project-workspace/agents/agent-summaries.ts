import orderBy from "lodash/orderBy";
import type { AgentSummary, ProjectWorkspaceData } from "../types";

type MutableAgentSummary = AgentSummary;

export function agentSummaries({
  data,
}: {
  data: ProjectWorkspaceData;
}): AgentSummary[] {
  const agents = new Map<string, MutableAgentSummary>();

  for (const activity of data.hypothesisActivities) {
    const agent = ensureAgent({
      agents,
      agentId: activity.actor,
    });

    agent.hypothesisActivityCount += 1;
    agent.latestActivityAt = latestTimestamp({
      left: agent.latestActivityAt,
      right: activity.created_at,
    });
  }

  for (const activity of data.experimentActivities) {
    const agent = ensureAgent({
      agents,
      agentId: activity.actor,
    });

    agent.experimentActivityCount += 1;
    agent.latestActivityAt = latestTimestamp({
      left: agent.latestActivityAt,
      right: activity.created_at,
    });
  }

  for (const activity of data.evaluationActivities) {
    const agent = ensureAgent({
      agents,
      agentId: activity.actor,
    });

    agent.evaluationActivityCount += 1;
    agent.latestActivityAt = latestTimestamp({
      left: agent.latestActivityAt,
      right: activity.created_at,
    });
  }

  return orderBy(
    Array.from(agents.values()),
    [(agent) => agent.latestActivityAt ?? "", (agent) => agent.id],
    ["desc", "asc"],
  );
}

function ensureAgent({
  agents,
  agentId,
}: {
  agents: Map<string, MutableAgentSummary>;
  agentId: string;
}): MutableAgentSummary {
  const existing = agents.get(agentId);

  if (existing) {
    return existing;
  }

  const agent = {
    id: agentId,
    latestActivityAt: null,
    hypothesisActivityCount: 0,
    experimentActivityCount: 0,
    evaluationActivityCount: 0,
  };

  agents.set(agentId, agent);
  return agent;
}

function latestTimestamp({
  left,
  right,
}: {
  left: string | null;
  right: string;
}): string {
  if (!left) {
    return right;
  }

  if (right > left) {
    return right;
  }

  return left;
}
