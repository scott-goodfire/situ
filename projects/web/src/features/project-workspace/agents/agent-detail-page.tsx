import { DxBadge } from "@almanac/web-ui";
import filter from "lodash/filter";
import { ActivityTimeline } from "../shared/activity-timeline";
import { agentSummaries } from "./agent-summaries";
import type { ActivityItem, ProjectWorkspaceData } from "../types";

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
      <section className="almanac-empty">
        <h2>Agent not found</h2>
        <p>No activity exists for agent {agentId}.</p>
      </section>
    );
  }

  const activities = activitiesForAgent({
    data,
    agentId,
  });

  return (
    <>
      <section className="almanac-object-page">
        <div className="almanac-object-page__header">
          <div>
            <p className="almanac-object-page__eyebrow">Agent</p>
            <h2>{agent.id}</h2>
          </div>
          <DxBadge>{activities.length} activities</DxBadge>
        </div>
        <p className="almanac-object-page__summary">
          Transcript-style agent views will build on this activity stream.
        </p>
      </section>

      <ActivityTimeline
        title="Activity"
        activities={activities}
        emptyLabel="No activity for this agent yet"
      />
    </>
  );
}

function activitiesForAgent({
  data,
  agentId,
}: {
  data: ProjectWorkspaceData;
  agentId: string;
}): ActivityItem[] {
  const hypothesisActivities = filter(
    data.hypothesisActivities,
    (activity) => activity.actor === agentId,
  ).map((activity) => ({
    id: `hypothesis-activity-${activity.id}`,
    actor: activity.actor,
    body: activity.body,
    kind: activity.payload?.activity_type
      ? `hypothesis:${String(activity.payload.activity_type)}`
      : "hypothesis:comment",
    createdAt: activity.created_at,
  }));

  const experimentActivities = filter(
    data.experimentActivities,
    (activity) => activity.actor === agentId,
  ).map((activity) => ({
    id: `experiment-activity-${activity.id}`,
    actor: activity.actor,
    body: activity.body,
    kind: activity.payload?.activity_type
      ? `experiment:${String(activity.payload.activity_type)}`
      : "experiment:comment",
    createdAt: activity.created_at,
  }));

  const evaluationActivities = filter(
    data.evaluationActivities,
    (activity) => activity.actor === agentId,
  ).map((activity) => ({
    id: `evaluation-activity-${activity.id}`,
    actor: activity.actor,
    body: activity.body,
    kind: activity.payload?.activity_type
      ? `evaluation:${String(activity.payload.activity_type)}`
      : "evaluation:comment",
    createdAt: activity.created_at,
  }));

  return [...hypothesisActivities, ...experimentActivities, ...evaluationActivities];
}
