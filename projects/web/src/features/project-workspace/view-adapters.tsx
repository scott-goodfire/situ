import type {
  EvaluationActivityRecord,
  EvaluationRecord,
} from "@situ/protocol";
import {
  type ActivityTimelineItem,
  type AgentTranscriptItemView,
  type EvaluationActivityListRow,
  type EvidenceSummaryModel,
  MarkdownText,
} from "@situ/web-app-ui";
import { DxBadge, mono, type DxBadgeTone, type DxTableRowTone } from "@situ/web-ui";
import { Link } from "@tanstack/react-router";
import type { ReactNode } from "react";
import {
  activityLabel,
  evidenceLabel,
  evidenceRowTone,
  evidenceState,
  evidenceTone,
  latestEvaluationActivity,
} from "../../selectors/evaluations";
import type { AgentTranscriptItem } from "../../selectors/agents";
import type { ProjectWorkspaceData } from "./types";
import * as s from "../../styles.css";

type RecordLinkProps =
  | {
      to: "/workspaces/$workspaceId/projects/$projectId/analyses/$analysisId";
      params: { workspaceId: string; projectId: string; analysisId: string };
      children: ReactNode;
    }
  | {
      to: "/workspaces/$workspaceId/projects/$projectId/hypotheses/$hypothesisId";
      params: { workspaceId: string; projectId: string; hypothesisId: string };
      children: ReactNode;
    }
  | {
      to: "/workspaces/$workspaceId/projects/$projectId/experiments/$experimentId";
      params: { workspaceId: string; projectId: string; experimentId: string };
      children: ReactNode;
    }
  | {
      to: "/workspaces/$workspaceId/projects/$projectId/evaluations/$evaluationId";
      params: { workspaceId: string; projectId: string; evaluationId: string };
      children: ReactNode;
    }
  | {
      to: "/workspaces/$workspaceId/projects/$projectId/tasks/$taskId";
      params: { workspaceId: string; projectId: string; taskId: string };
      children: ReactNode;
    }
  | {
      to: "/workspaces/$workspaceId/projects/$projectId/agents/$agentId";
      params: { workspaceId: string; projectId: string; agentId: string };
      children: ReactNode;
    };

export function recordLink(props: RecordLinkProps) {
  if (props.to === "/workspaces/$workspaceId/projects/$projectId/analyses/$analysisId") {
    return (
      <Link className={s.recordLink} to={props.to} params={props.params}>
        <MarkdownText value={props.children} variant="inline" allowLinks={false} />
      </Link>
    );
  }

  if (props.to === "/workspaces/$workspaceId/projects/$projectId/hypotheses/$hypothesisId") {
    return (
      <Link className={s.recordLink} to={props.to} params={props.params}>
        <MarkdownText value={props.children} variant="inline" allowLinks={false} />
      </Link>
    );
  }

  if (props.to === "/workspaces/$workspaceId/projects/$projectId/experiments/$experimentId") {
    return (
      <Link className={s.recordLink} to={props.to} params={props.params}>
        <MarkdownText value={props.children} variant="inline" allowLinks={false} />
      </Link>
    );
  }

  if (props.to === "/workspaces/$workspaceId/projects/$projectId/evaluations/$evaluationId") {
    return (
      <Link className={s.recordLink} to={props.to} params={props.params}>
        <MarkdownText value={props.children} variant="inline" allowLinks={false} />
      </Link>
    );
  }

  if (props.to === "/workspaces/$workspaceId/projects/$projectId/tasks/$taskId") {
    return (
      <Link className={s.recordLink} to={props.to} params={props.params}>
        <MarkdownText value={props.children} variant="inline" allowLinks={false} />
      </Link>
    );
  }

  return (
    <Link className={s.recordLink} to={props.to} params={props.params}>
      <MarkdownText value={props.children} variant="inline" allowLinks={false} />
    </Link>
  );
}

export function projectTrajectoryLink({
  projectId,
  workspaceId,
  experimentId,
  children,
  className,
}: {
  projectId: string;
  workspaceId: string;
  experimentId: string;
  children: ReactNode;
  className?: string;
}) {
  return (
    <Link
      className={className ?? s.recordLink}
      to="/workspaces/$workspaceId/projects/$projectId/trajectory"
      params={{ workspaceId, projectId }}
      search={{ experimentId }}
    >
      {children}
    </Link>
  );
}

export function evidenceSummary({
  evaluations,
  activities,
  missingLabel = "No evidence yet",
}: {
  evaluations: EvaluationRecord[];
  activities: EvaluationActivityRecord[];
  missingLabel?: string;
}): EvidenceSummaryModel {
  const state = evidenceState({ evaluations, activities });
  const latestActivity = latestEvaluationActivity({ activities });
  return {
    label: evidenceLabel({
      state,
      evaluationCount: evaluations.length,
      activityCount: activities.length,
    }),
    tone: evidenceTone({ state }),
    body: latestActivity?.body ?? missingLabel,
  };
}

export function evaluationRows({
  evaluations,
  activitiesForEvaluation,
  projectId,
  workspaceId,
}: {
  evaluations: EvaluationRecord[];
  activitiesForEvaluation: (evaluationId: string) => EvaluationActivityRecord[];
  projectId: string;
  workspaceId: string;
}): EvaluationActivityListRow[] {
  return evaluations.map((evaluation) => {
    const activities = activitiesForEvaluation(evaluation.id);
    const latestActivity = latestEvaluationActivity({ activities });
    return {
      id: evaluation.id,
      title: recordLink({
        to: "/workspaces/$workspaceId/projects/$projectId/evaluations/$evaluationId",
        params: { workspaceId, projectId, evaluationId: evaluation.id },
        children: evaluation.title,
      }),
      titleSort: evaluation.title,
      status: <DxBadge>{evaluation.status}</DxBadge>,
      statusSort: evaluation.status,
      latest: latestActivity ? (
        <div className={s.evaluationLatest}>
          <span className={mono}>{activityLabel({ activity: latestActivity })}</span>
          <MarkdownText value={latestActivity.body} variant="inline" />
        </div>
      ) : (
        evaluation.summary
      ),
      updatedAt: evaluation.updated_at,
      rowTone: latestActivity ? evidenceRowTone({ activity: latestActivity }) : "neutral",
    };
  });
}

export function activityItem({
  prefix,
  id,
  actor,
  body,
  kind,
  payload,
  createdAt,
}: {
  prefix: string;
  id: number | string;
  actor: string;
  body: string;
  kind: string;
  payload?: Record<string, unknown>;
  createdAt: string;
}): ActivityTimelineItem {
  return {
    id: `${prefix}-${id}`,
    actor,
    body,
    kind: kind === "recorded" && payload?.record_type ? String(payload.record_type) : kind,
    createdAt,
  };
}

export function transcriptItemView({
  item,
  data,
}: {
  item: AgentTranscriptItem;
  data: ProjectWorkspaceData;
}): AgentTranscriptItemView {
  return {
    id: item.id,
    title: item.title,
    body: item.body,
    createdAt: item.createdAt,
    tone: item.tone,
    activityType: item.activityType,
    entityKind: item.entity.kind,
    entityLink: entityLink({ item, data }),
  };
}

export function projectRouteParams({
  data,
}: {
  data: ProjectWorkspaceData;
}): {
  projectId: string;
  workspaceId: string;
} {
  return {
    projectId: data.projectId,
    workspaceId: data.workspaceId,
  };
}

export function researchStatusTone({
  status,
}: {
  status: "triage" | "accepted" | "active" | "done" | "canceled" | "failed" | "in_review";
}): DxBadgeTone {
  if (status === "failed") return "danger";
  if (status === "done") return "success";
  if (status === "active") return "warning";
  return "neutral";
}

export function evaluationRowTone({
  activities,
}: {
  activities: EvaluationActivityRecord[];
}): DxTableRowTone {
  const latestActivity = latestEvaluationActivity({ activities });
  return latestActivity ? evidenceRowTone({ activity: latestActivity }) : "neutral";
}

function entityLink({
  item,
  data,
}: {
  item: AgentTranscriptItem;
  data: ProjectWorkspaceData;
}) {
  const params = projectRouteParams({ data });

  if (item.entity.kind === "hypothesis") {
    return recordLink({
      to: "/workspaces/$workspaceId/projects/$projectId/hypotheses/$hypothesisId",
      params: { ...params, hypothesisId: item.entity.id },
      children: item.entity.title,
    });
  }

  if (item.entity.kind === "experiment") {
    return recordLink({
      to: "/workspaces/$workspaceId/projects/$projectId/experiments/$experimentId",
      params: { ...params, experimentId: item.entity.id },
      children: item.entity.title,
    });
  }

  return recordLink({
    to: "/workspaces/$workspaceId/projects/$projectId/evaluations/$evaluationId",
    params: { ...params, evaluationId: item.entity.id },
    children: item.entity.title,
  });
}
