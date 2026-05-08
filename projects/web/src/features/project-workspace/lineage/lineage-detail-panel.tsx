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
      <div className={s.sectionsGrid}>
        <div className={s.sectionsColumn}>
          <LinkedHypotheses hypotheses={linkedHypotheses} projectId={data.projectId} />
          <Artifacts artifacts={artifacts} />
        </div>
        <div className={s.sectionsColumn}>
          <EvaluationActivityList
            title="Evidence"
            data={data}
            evaluations={evaluations}
            emptyLabel="No evaluations attached"
          />
          <ActivityTimeline
            title="Activity"
            activities={activities}
            emptyLabel="No experiment activity yet"
          />
        </div>
      </div>
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
      <div className={s.headerMain}>
        <p className={s.eyebrow}>{experiment.id}</p>
        <h2 className={s.titleEl}>{experiment.title}</h2>
        {experiment.summary && <p className={s.summary}>{experiment.summary}</p>}
      </div>
      <div className={s.headerSide}>
        <DxBadge tone={statusTone({ status: experiment.status, hasConcern })}>
          {hasConcern ? "concern" : experiment.status}
        </DxBadge>
        <LineageMeta experiment={experiment} parent={parent} projectId={projectId} />
      </div>
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
  const items: Array<{ key: string; label: string; node: React.ReactNode }> = [];
  if (parent) {
    items.push({
      key: "parent",
      label: "parent",
      node: (
        <Link
          to="/projects/$projectId/lineage"
          params={{ projectId }}
          search={{ experimentId: parent.id }}
          className={s.lineageMetaValue}
        >
          {parent.id}
        </Link>
      ),
    });
  }
  if (experiment.research_thread) {
    items.push({
      key: "thread",
      label: "thread",
      node: <span className={s.lineageMetaValue}>{experiment.research_thread}</span>,
    });
  }
  if (experiment.base_commit) {
    items.push({
      key: "base",
      label: "base",
      node: <span className={s.lineageMetaValue}>{shortSha(experiment.base_commit)}</span>,
    });
  }
  if (experiment.candidate_commit) {
    items.push({
      key: "candidate",
      label: "candidate",
      node: <span className={s.lineageMetaValue}>{shortSha(experiment.candidate_commit)}</span>,
    });
  }
  if (items.length === 0) return null;
  return (
    <div className={s.lineageMeta}>
      {items.map((item) => (
        <span key={item.key} className={s.lineageMetaRow}>
          <span className={s.lineageMetaLabel}>{item.label}</span>
          {item.node}
        </span>
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
      {hypotheses.length === 0 && <p className={s.muted}>No linked hypotheses</p>}
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

function Artifacts({ artifacts }: { artifacts: ArtifactRecord[] }) {
  return (
    <DxSection title="Artifacts">
      {artifacts.length === 0 && <p className={s.muted}>No artifacts</p>}
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
