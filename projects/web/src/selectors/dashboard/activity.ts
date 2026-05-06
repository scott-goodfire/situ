import type { EventRecord } from "@situ/protocol";
import keyBy from "lodash/keyBy";
import orderBy from "lodash/orderBy";
import type { ProjectWorkspaceData } from "../../features/project-workspace/types";
import type { ActivityFeedRow, DashboardTone } from "./types";

export function activityFeed({
  data,
  maxRows,
}: {
  data: ProjectWorkspaceData;
  maxRows?: number;
}): ActivityFeedRow[] {
  const tasksById = keyBy(data.tasks, "id");
  const hypothesesById = keyBy(data.hypotheses, "id");
  const experimentsById = keyBy(data.experiments, "id");
  const evaluationsById = keyBy(data.evaluations, "id");

  const rows: ActivityFeedRow[] = [
    ...data.taskActivities.map(
      (activity): ActivityFeedRow => ({
        id: `task-activity:${activity.id}`,
        label: "task",
        body: prefixedBody({
          parent: tasksById[activity.task_id]?.title,
          body: activity.body,
        }),
        tone: toneFromActivityPayload({ payload: activity.payload }),
        createdAt: activity.created_at,
      }),
    ),
    ...data.hypothesisActivities.map(
      (activity): ActivityFeedRow => ({
        id: `hypothesis-activity:${activity.id}`,
        label: labelFromActivityPayload({ payload: activity.payload }),
        body: prefixedBody({
          parent: hypothesesById[activity.hypothesis_id]?.title,
          body: activity.body,
        }),
        tone: toneFromActivityPayload({ payload: activity.payload }),
        createdAt: activity.created_at,
      }),
    ),
    ...data.experimentActivities.map(
      (activity): ActivityFeedRow => ({
        id: `experiment-activity:${activity.id}`,
        label: labelFromActivityPayload({ payload: activity.payload }),
        body: prefixedBody({
          parent: experimentsById[activity.experiment_id]?.title,
          body: activity.body,
        }),
        tone: toneFromActivityPayload({ payload: activity.payload }),
        createdAt: activity.created_at,
      }),
    ),
    ...data.evaluationActivities.map(
      (activity): ActivityFeedRow => ({
        id: `evaluation-activity:${activity.id}`,
        label: labelFromActivityPayload({ payload: activity.payload }),
        body: prefixedBody({
          parent: evaluationsById[activity.evaluation_id]?.title,
          body: activity.body,
        }),
        tone: toneFromActivityPayload({ payload: activity.payload }),
        createdAt: activity.created_at,
      }),
    ),
    ...data.events.map(
      (event): ActivityFeedRow => ({
        id: `event:${event.id}`,
        label: "event",
        body: event.message,
        tone: toneFromEvent({ event }),
        createdAt: event.created_at,
      }),
    ),
  ];

  const ordered = orderBy(
    rows,
    [(row) => Date.parse(row.createdAt) || 0, (row) => row.id],
    ["desc", "asc"],
  );

  if (maxRows !== undefined) {
    return ordered.slice(0, maxRows);
  }

  return ordered;
}

export function lastActivityLabel({
  data,
}: {
  data: ProjectWorkspaceData;
}): string | undefined {
  const latest = activityFeed({ data, maxRows: 1 }).at(0);

  if (!latest) {
    return undefined;
  }

  return `last ${latest.label} ${shortTime({ isoTimestamp: latest.createdAt })}`;
}

function prefixedBody({
  parent,
  body,
}: {
  parent: string | undefined;
  body: string;
}): string {
  return parent ? `${parent}: ${body}` : body;
}

function labelFromActivityPayload({
  payload,
}: {
  payload: Record<string, unknown> | undefined;
}): string {
  const activityType = payload?.activity_type;

  if (activityType === "concern") {
    return "concern";
  }

  if (activityType === "result") {
    return "result";
  }

  return "update";
}

function toneFromActivityPayload({
  payload,
}: {
  payload: Record<string, unknown> | undefined;
}): DashboardTone {
  const activityType = payload?.activity_type;

  if (activityType === "concern") {
    return "warning";
  }

  if (activityType === "result") {
    return "info";
  }

  return "neutral";
}

function toneFromEvent({ event }: { event: EventRecord }): DashboardTone {
  if (event.type.includes("failed") || event.type.includes("error")) {
    return "danger";
  }

  if (event.type.includes("concern")) {
    return "warning";
  }

  if (event.type.includes("started")) {
    return "info";
  }

  return "neutral";
}

function shortTime({ isoTimestamp }: { isoTimestamp: string }): string {
  const date = new Date(isoTimestamp);

  if (Number.isNaN(date.getTime())) {
    return isoTimestamp;
  }

  return `${date.toISOString().slice(11, 19)}Z`;
}
