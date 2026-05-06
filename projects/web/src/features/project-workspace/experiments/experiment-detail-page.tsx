import type { ArtifactRecord, ExperimentRecord, HypothesisRecord } from "@situ/protocol";
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
import { evaluationsForExperiment } from "../../../selectors/evaluations";
import {
  artifactsForExperiment,
  experimentActivitiesForExperiment,
  hasConcernActivities,
  hypothesesForExperiment,
} from "../../../selectors/experiments";
import * as s from "../../../styles.css";
import { ActivityTimeline } from "../__shared__/activity-timeline";
import { EvaluationActivityList } from "../evidence/evaluation-activity-list";
import type { ActivityItem, ProjectWorkspaceData } from "../types";

type LinkedHypothesisRow = {
  hypothesis: HypothesisRecord;
};

type ArtifactRow = {
  artifact: ArtifactRecord;
};

export function ExperimentDetailPage({
  data,
  experimentId,
}: {
  data: ProjectWorkspaceData;
  experimentId: string;
}) {
  const experiment = data.experiments.find((record) => record.id === experimentId);

  if (!experiment) {
    return (
      <DxEmptyState
        heading="Experiment not found"
        description={`No experiment exists with id ${experimentId}.`}
      />
    );
  }

  const linkedHypotheses = hypothesesForExperiment({
    data,
    experimentId,
  });
  const rawActivities = experimentActivitiesForExperiment({
    data,
    experimentId,
  });
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
  const artifacts = artifactsForExperiment({
    data,
    experimentId,
  });
  const evaluations = evaluationsForExperiment({
    data,
    experimentId,
  });
  const hasConcern = hasConcernActivities({ activities: rawActivities });

  return (
    <>
      <section className={s.objectPage}>
        <div className={s.objectPageHeader}>
          <div>
            <p className={s.objectPageEyebrow}>{experiment.id}</p>
            <h2>{experiment.title}</h2>
          </div>
          <DxBadge
            tone={statusTone({
              status: experiment.status,
              hasConcern,
            })}
          >
            {hasConcern ? "concern" : experiment.status}
          </DxBadge>
        </div>
        <p className={s.objectPageSummary}>{experiment.summary}</p>
      </section>

      <LinkedHypotheses
        projectId={data.projectId}
        hypotheses={linkedHypotheses}
      />
      <EvaluationActivityList
        title="Evidence"
        data={data}
        evaluations={evaluations}
        emptyLabel="No evaluations attached to this experiment yet"
      />
      <Artifacts artifacts={artifacts} />
      <ActivityTimeline
        title="Activity"
        activities={activities}
        emptyLabel="No experiment activity yet"
      />
    </>
  );
}

function LinkedHypotheses({
  projectId,
  hypotheses,
}: {
  projectId: string;
  hypotheses: HypothesisRecord[];
}) {
  const columns = linkedHypothesisColumns({ projectId });
  const rows = hypotheses.map((hypothesis) => ({ hypothesis }));

  return (
    <DxSection title="Linked Hypotheses">
      <DxTable
        columns={columns}
        rows={rows}
        getRowKey={({ row }) => row.hypothesis.id}
        emptyLabel="No linked hypotheses yet"
        density="compact"
        stickyHeader
      />
    </DxSection>
  );
}

function Artifacts({ artifacts }: { artifacts: ArtifactRecord[] }) {
  const columns = artifactColumns();
  const rows = artifacts.map((artifact) => ({ artifact }));

  return (
    <DxSection title="Artifacts">
      <DxTable
        columns={columns}
        rows={rows}
        getRowKey={({ row }) => row.artifact.id}
        emptyLabel="No artifacts yet"
        density="compact"
        stickyHeader
      />
    </DxSection>
  );
}

function linkedHypothesisColumns({
  projectId,
}: {
  projectId: string;
}): Array<DxTableColumn<LinkedHypothesisRow>> {
  return [
    {
      id: "hypothesis",
      header: "Hypothesis",
      width: "34%",
      renderCell: ({ row }) => (
        <div className={s.recordCell}>
          <Link
            className={s.recordLink}
            to="/projects/$projectId/hypotheses/$hypothesisId"
            params={{
              projectId,
              hypothesisId: row.hypothesis.id,
            }}
          >
            {row.hypothesis.title}
          </Link>
          <span className={s.recordId}>{row.hypothesis.id}</span>
        </div>
      ),
    },
    {
      id: "status",
      header: "Status",
      width: "120px",
      renderCell: ({ row }) => <DxBadge>{row.hypothesis.status}</DxBadge>,
    },
    {
      id: "summary",
      header: "Summary",
      renderCell: ({ row }) => row.hypothesis.summary,
    },
  ];
}

function artifactColumns(): Array<DxTableColumn<ArtifactRow>> {
  return [
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
}

function statusTone({
  status,
  hasConcern,
}: {
  status: ExperimentRecord["status"];
  hasConcern: boolean;
}): DxBadgeTone {
  if (hasConcern) {
    return "warning";
  }

  if (status === "closed") {
    return "success";
  }

  if (status === "active") {
    return "warning";
  }

  return "neutral";
}
