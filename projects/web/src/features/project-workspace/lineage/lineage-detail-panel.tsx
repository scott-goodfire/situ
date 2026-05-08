import type {
  ArtifactRecord,
  ExperimentRecord,
  HypothesisRecord,
} from "@situ/protocol";
import { DxBadge, DxEmptyState, DxSection, mono, type DxBadgeTone } from "@situ/web-ui";
import { Link } from "@tanstack/react-router";
import { evaluationsForExperiment } from "../../../selectors/evaluations";
import {
  artifactsForExperiment,
  experimentActivitiesForExperiment,
  hasConcernActivities,
  hypothesesForExperiment,
} from "../../../selectors/experiments";
import { ActivityTimeline } from "../__shared__/activity-timeline";
import { EvaluationActivityList } from "../evidence/evaluation-activity-list";
import type { ActivityItem, ProjectWorkspaceData } from "../types";
import * as s from "./lineage-detail-panel.css";

export function LineageDetailPanel({
  data,
  experimentId,
}: {
  data: ProjectWorkspaceData;
  experimentId: string | undefined;
}) {
  if (!experimentId) {
    return (
      <aside className={s.panel}>
        <p className={s.placeholder}>Select an experiment to see its evidence and activity.</p>
      </aside>
    );
  }

  const experiment = data.experiments.find((e) => e.id === experimentId);
  if (!experiment) {
    return (
      <aside className={s.panel}>
        <DxEmptyState
          heading="Experiment not found"
          description={`No experiment with id ${experimentId}.`}
        />
      </aside>
    );
  }

  const linkedHypotheses = hypothesesForExperiment({ data, experimentId });
  const rawActivities = experimentActivitiesForExperiment({ data, experimentId });
  const activities = rawActivities.map(
    (activity): ActivityItem => ({
      id: `experiment-activity-${activity.id}`,
      actor: activity.actor,
      body: activity.body,
      kind: activity.payload?.activity_type
        ? String(activity.payload.activity_type)
        : activity.kind,
      createdAt: activity.created_at,
    }),
  );
  const artifacts = artifactsForExperiment({ data, experimentId });
  const evaluations = evaluationsForExperiment({ data, experimentId });
  const hasConcern = hasConcernActivities({ activities: rawActivities });
  const parent = experiment.parent_experiment_id
    ? data.experiments.find((e) => e.id === experiment.parent_experiment_id)
    : undefined;

  return (
    <aside className={s.panel}>
      <Header
        experiment={experiment}
        hasConcern={hasConcern}
        parent={parent}
        projectId={data.projectId}
      />
      <LinkedHypotheses hypotheses={linkedHypotheses} projectId={data.projectId} />
      <EvaluationActivityList
        title="Evidence"
        data={data}
        evaluations={evaluations}
        emptyLabel="No evaluations attached"
      />
      <Artifacts artifacts={artifacts} projectId={data.projectId} />
      <ActivityTimeline
        title="Activity"
        activities={activities}
        emptyLabel="No experiment activity yet"
      />
    </aside>
  );
}

function Header({
  experiment,
  hasConcern,
  parent,
  projectId,
}: {
  experiment: ExperimentRecord;
  hasConcern: boolean;
  parent: ExperimentRecord | undefined;
  projectId: string;
}) {
  return (
    <header className={s.header}>
      <div className={s.headerTop}>
        <div>
          <p className={s.eyebrow}>{experiment.id}</p>
          <h2 className={s.titleEl}>{experiment.title}</h2>
        </div>
        <DxBadge tone={statusTone({ status: experiment.status, hasConcern })}>
          {hasConcern ? "concern" : experiment.status}
        </DxBadge>
      </div>
      <p className={s.summary}>{experiment.summary}</p>
      <LineageMeta experiment={experiment} parent={parent} projectId={projectId} />
    </header>
  );
}

function LineageMeta({
  experiment,
  parent,
  projectId,
}: {
  experiment: ExperimentRecord;
  parent: ExperimentRecord | undefined;
  projectId: string;
}) {
  const items: Array<{ key: string; node: React.ReactNode }> = [];
  if (parent) {
    items.push({
      key: "parent",
      node: (
        <span>
          parent{" "}
          <Link
            to="/projects/$projectId/lineage"
            params={{ projectId }}
            search={{ experimentId: parent.id }}
            className={mono}
          >
            {parent.id}
          </Link>
        </span>
      ),
    });
  }
  if (experiment.research_thread) {
    items.push({
      key: "thread",
      node: <span>thread {experiment.research_thread}</span>,
    });
  }
  if (experiment.base_commit) {
    items.push({
      key: "base",
      node: (
        <span>
          base <span className={mono}>{shortSha(experiment.base_commit)}</span>
        </span>
      ),
    });
  }
  if (experiment.candidate_commit) {
    items.push({
      key: "candidate",
      node: (
        <span>
          candidate <span className={mono}>{shortSha(experiment.candidate_commit)}</span>
        </span>
      ),
    });
  }
  if (items.length === 0) return null;
  return (
    <div className={s.lineageMeta}>
      {items.map((item) => (
        <span key={item.key}>{item.node}</span>
      ))}
    </div>
  );
}

function LinkedHypotheses({
  hypotheses,
  projectId,
}: {
  hypotheses: HypothesisRecord[];
  projectId: string;
}) {
  return (
    <DxSection title="Linked Hypotheses">
      {hypotheses.length === 0 && (
        <p className={s.linkedItemSummary}>No linked hypotheses</p>
      )}
      {hypotheses.length > 0 && (
        <ol className={s.linkedItemList}>
          {hypotheses.map((hypothesis) => (
            <li key={hypothesis.id} className={s.linkedItem}>
              <span className={s.linkedItemId}>{hypothesis.id}</span>
              <span className={s.linkedItemBody}>
                <Link
                  to="/projects/$projectId/hypotheses/$hypothesisId"
                  params={{ projectId, hypothesisId: hypothesis.id }}
                  className={s.linkedItemTitle}
                >
                  {hypothesis.title}
                </Link>
                <span className={s.linkedItemSummary}>{hypothesis.summary}</span>
              </span>
            </li>
          ))}
        </ol>
      )}
    </DxSection>
  );
}

function Artifacts({
  artifacts,
  projectId: _projectId,
}: {
  artifacts: ArtifactRecord[];
  projectId: string;
}) {
  return (
    <DxSection title="Artifacts">
      {artifacts.length === 0 && (
        <p className={s.linkedItemSummary}>No artifacts</p>
      )}
      {artifacts.length > 0 && (
        <ol className={s.linkedItemList}>
          {artifacts.map((artifact) => (
            <li key={artifact.id} className={s.linkedItem}>
              <span className={s.linkedItemId}>{artifact.id}</span>
              <span className={s.linkedItemBody}>
                <span className={s.linkedItemTitle}>{artifact.title}</span>
                <span className={mono}>{artifact.path}</span>
              </span>
            </li>
          ))}
        </ol>
      )}
    </DxSection>
  );
}

function statusTone({
  status,
  hasConcern,
}: {
  status: ExperimentRecord["status"];
  hasConcern: boolean;
}): DxBadgeTone {
  if (hasConcern) return "warning";
  if (status === "closed") return "success";
  if (status === "active") return "warning";
  return "neutral";
}

function shortSha(sha: string): string {
  return sha.slice(0, 7);
}
