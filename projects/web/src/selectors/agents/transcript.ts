import type {
  EvaluationActivityRecord,
  EvaluationRecord,
  ExperimentActivityRecord,
  ExperimentRecord,
  HypothesisActivityRecord,
  HypothesisRecord,
} from "@situ/protocol";
import filter from "lodash/filter";
import keyBy from "lodash/keyBy";
import orderBy from "lodash/orderBy";
import type { ProjectWorkspaceData } from "../../features/project-workspace/types";
import type {
  AgentTranscriptEntityKind,
  AgentTranscriptItem,
  AgentTranscriptTone,
} from "./types";

export function agentTranscriptItems({
  data,
  agentId,
}: {
  data: ProjectWorkspaceData;
  agentId: string;
}): AgentTranscriptItem[] {
  const hypothesesById = keyBy(data.hypotheses, "id");
  const experimentsById = keyBy(data.experiments, "id");
  const evaluationsById = keyBy(data.evaluations, "id");

  const hypothesisItems = filter(
    data.hypothesisActivities,
    (activity) => activity.actor === agentId,
  ).map((activity) =>
    hypothesisActivityItem({
      activity,
      hypothesis: hypothesesById[activity.hypothesis_id],
    }),
  );

  const experimentItems = filter(
    data.experimentActivities,
    (activity) => activity.actor === agentId,
  ).map((activity) =>
    experimentActivityItem({
      activity,
      experiment: experimentsById[activity.experiment_id],
    }),
  );

  const evaluationItems = filter(
    data.evaluationActivities,
    (activity) => activity.actor === agentId,
  ).map((activity) =>
    evaluationActivityItem({
      activity,
      evaluation: evaluationsById[activity.evaluation_id],
    }),
  );

  return orderBy(
    [...hypothesisItems, ...experimentItems, ...evaluationItems],
    [(item) => item.createdAt, (item) => item.id],
    ["asc", "asc"],
  );
}

function hypothesisActivityItem({
  activity,
  hypothesis,
}: {
  activity: HypothesisActivityRecord;
  hypothesis: HypothesisRecord | undefined;
}): AgentTranscriptItem {
  const activityType = activityTypeFor({
    payload: activity.payload,
  });

  return {
    id: `hypothesis-activity-${activity.id}`,
    actor: activity.actor,
    title: titleFor({
      entityKind: "hypothesis",
      activityType,
    }),
    body: activity.body,
    createdAt: activity.created_at,
    tone: toneFor({
      activityType,
      body: activity.body,
    }),
    activityType,
    entity: {
      kind: "hypothesis",
      id: activity.hypothesis_id,
      title: hypothesis?.title ?? activity.hypothesis_id,
    },
  };
}

function experimentActivityItem({
  activity,
  experiment,
}: {
  activity: ExperimentActivityRecord;
  experiment: ExperimentRecord | undefined;
}): AgentTranscriptItem {
  const activityType = activityTypeFor({
    payload: activity.payload,
  });

  return {
    id: `experiment-activity-${activity.id}`,
    actor: activity.actor,
    title: titleFor({
      entityKind: "experiment",
      activityType,
    }),
    body: activity.body,
    createdAt: activity.created_at,
    tone: toneFor({
      activityType,
      body: activity.body,
    }),
    activityType,
    entity: {
      kind: "experiment",
      id: activity.experiment_id,
      title: experiment?.title ?? activity.experiment_id,
    },
  };
}

function evaluationActivityItem({
  activity,
  evaluation,
}: {
  activity: EvaluationActivityRecord;
  evaluation: EvaluationRecord | undefined;
}): AgentTranscriptItem {
  const activityType = activityTypeFor({
    payload: activity.payload,
  });

  return {
    id: `evaluation-activity-${activity.id}`,
    actor: activity.actor,
    title: titleFor({
      entityKind: "evaluation",
      activityType,
    }),
    body: activity.body,
    createdAt: activity.created_at,
    tone: toneFor({
      activityType,
      body: activity.body,
    }),
    activityType,
    entity: {
      kind: "evaluation",
      id: activity.evaluation_id,
      title: evaluation?.title ?? activity.evaluation_id,
    },
  };
}

function activityTypeFor({
  payload,
}: {
  payload: Record<string, unknown> | undefined;
}): string {
  const activityType = payload?.activity_type;

  if (typeof activityType !== "string" || activityType.length === 0) {
    return "comment";
  }

  return activityType;
}

function titleFor({
  entityKind,
  activityType,
}: {
  entityKind: AgentTranscriptEntityKind;
  activityType: string;
}): string {
  if (activityType === "concern" || activityType === "warning") {
    return "Raised concern";
  }

  if (activityType === "result") {
    if (entityKind === "evaluation") {
      return "Recorded evidence";
    }

    return "Recorded result";
  }

  if (activityType === "change") {
    return "Updated experiment";
  }

  if (activityType === "interpretation") {
    return "Added interpretation";
  }

  if (activityType === "decision") {
    return "Recorded decision";
  }

  if (entityKind === "hypothesis") {
    return "Updated hypothesis";
  }

  if (entityKind === "experiment") {
    return "Updated experiment";
  }

  return "Updated evaluation";
}

function toneFor({
  activityType,
  body,
}: {
  activityType: string;
  body: string;
}): AgentTranscriptTone {
  const normalizedActivityType = activityType.toLowerCase();

  if (
    normalizedActivityType === "error" ||
    normalizedActivityType === "failed" ||
    normalizedActivityType === "failure"
  ) {
    return "danger";
  }

  const searchableText = `${activityType} ${body}`.toLowerCase();

  if (
    searchableText.includes("concern") ||
    searchableText.includes("suspicious") ||
    searchableText.includes("warning") ||
    searchableText.includes("needs review")
  ) {
    return "warning";
  }

  return "neutral";
}
