import type {
  ArtifactRecord,
  EvaluationActivityRecord,
  EvaluationRecord,
  ExperimentRecord,
} from "@situ/protocol";
import {
  DxBadge,
  DxEmptyState,
  DxSection,
  DxTable,
  mono,
  type DxBadgeTone,
  type DxTableColumn,
} from "@situ/web-ui";
import { Link } from "@tanstack/react-router";
import filter from "lodash/filter";
import * as s from "../../../styles.css";
import {
  activityLabel,
  evaluationActivitiesForEvaluation,
  isConcernActivity,
  latestEvaluationActivity,
} from "../../../selectors/evaluations";
import { ActivityTimeline } from "../__shared__/activity-timeline";
import type { ActivityItem, ProjectWorkspaceData } from "../types";

type ArtifactRow = {
  artifact: ArtifactRecord;
};

export function EvaluationDetailPage({
  data,
  evaluationId,
}: {
  data: ProjectWorkspaceData;
  evaluationId: string;
}) {
  const evaluation = data.evaluations.find((record) => record.id === evaluationId);

  if (!evaluation) {
    return (
      <DxEmptyState
        heading="Evaluation not found"
        description={`No evaluation exists with id ${evaluationId}.`}
      />
    );
  }

  const activities = evaluationActivitiesForEvaluation({
    data,
    evaluationId,
  });
  const sourceExperiment = sourceExperimentForEvaluation({
    data,
    evaluation,
  });
  const artifacts = artifactsForEvaluation({
    data,
    evaluationId,
  });
  const hasConcern = activities.some((activity) => isConcernActivity({ activity }));
  const latestActivity = latestEvaluationActivity({
    activities,
  });

  return (
    <>
      <section className={s.objectPage}>
        <div className={s.objectPageHeader}>
          <div>
            <p className={s.objectPageEyebrow}>{evaluation.id}</p>
            <h2>{evaluation.title}</h2>
          </div>
          <DxBadge
            tone={statusTone({
              evaluation,
              hasConcern,
            })}
          >
            {hasConcern ? "concern" : evaluation.status}
          </DxBadge>
        </div>
        <p className={s.objectPageSummary}>
          {latestActivity?.body ?? evaluation.summary}
        </p>
      </section>

      <EvaluationSource
        projectId={data.projectId}
        evaluation={evaluation}
        experiment={sourceExperiment}
      />
      <Artifacts artifacts={artifacts} />
      <EvaluationTranscript activities={activities} />
    </>
  );
}

function EvaluationSource({
  projectId,
  evaluation,
  experiment,
}: {
  projectId: string;
  evaluation: EvaluationRecord;
  experiment: ExperimentRecord | undefined;
}) {
  if (experiment) {
    return (
      <DxSection title="Source">
        <div className={s.recordCell}>
          <Link
            className={s.recordLink}
            to="/projects/$projectId/experiments/$experimentId"
            params={{
              projectId,
              experimentId: experiment.id,
            }}
          >
            {experiment.title}
          </Link>
          <span className={s.recordId}>{experiment.id}</span>
        </div>
      </DxSection>
    );
  }

  return (
    <DxSection title="Source">
      <div className={s.recordCell}>
        <span>Baseline evidence</span>
        {evaluation.created_in_session_id && (
          <span className={s.recordId}>{evaluation.created_in_session_id}</span>
        )}
      </div>
    </DxSection>
  );
}

function Artifacts({ artifacts }: { artifacts: ArtifactRecord[] }) {
  const rows = artifacts.map((artifact) => ({ artifact }));

  return (
    <DxSection title="Artifacts">
      <DxTable
        columns={artifactColumns}
        rows={rows}
        getRowKey={({ row }) => row.artifact.id}
        emptyLabel="No artifacts yet"
        density="compact"
        stickyHeader
      />
    </DxSection>
  );
}

const artifactColumns: Array<DxTableColumn<ArtifactRow>> = [
  {
    id: "artifact",
    header: "Artifact",
    width: "30%",
    renderCell: ({ row }) => (
      <div className={s.recordCell}>
        <span className={s.recordLink}>{row.artifact.title}</span>
        <span className={s.recordId}>{row.artifact.id}</span>
      </div>
    ),
  },
  {
    id: "kind",
    header: "Kind",
    width: "120px",
    renderCell: ({ row }) => row.artifact.kind,
  },
  {
    id: "path",
    header: "Path",
    renderCell: ({ row }) => <span className={mono}>{row.artifact.path}</span>,
  },
];

function EvaluationTranscript({
  activities,
}: {
  activities: EvaluationActivityRecord[];
}) {
  const visibleActivities = activities.slice(-5);

  return (
    <ActivityTimeline
      title="Evidence"
      activities={activityItemsForEvaluation({ activities: visibleActivities })}
      emptyLabel="No evaluation evidence yet"
    />
  );
}

function sourceExperimentForEvaluation({
  data,
  evaluation,
}: {
  data: ProjectWorkspaceData;
  evaluation: EvaluationRecord;
}): ExperimentRecord | undefined {
  if (!evaluation.associated_experiment_id) {
    return undefined;
  }

  return data.experiments.find(
    (experiment) => experiment.id === evaluation.associated_experiment_id,
  );
}

function artifactsForEvaluation({
  data,
  evaluationId,
}: {
  data: ProjectWorkspaceData;
  evaluationId: string;
}): ArtifactRecord[] {
  return filter(
    data.artifacts,
    (artifact) =>
      artifact.associated_entity_kind === "evaluation" &&
      artifact.associated_entity_id === evaluationId,
  );
}

function activityItemsForEvaluation({
  activities,
}: {
  activities: EvaluationActivityRecord[];
}): ActivityItem[] {
  return activities.map((activity) => ({
    id: `evaluation-activity-${activity.id}`,
    actor: activity.actor,
    body: activity.body,
    kind: activityLabel({ activity }),
    createdAt: activity.created_at,
  }));
}

function statusTone({
  evaluation,
  hasConcern,
}: {
  evaluation: EvaluationRecord;
  hasConcern: boolean;
}): DxBadgeTone {
  if (hasConcern) {
    return "warning";
  }

  if (evaluation.status === "closed") {
    return "success";
  }

  if (evaluation.status === "active") {
    return "warning";
  }

  return "neutral";
}
