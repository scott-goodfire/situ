import type { ArtifactRecord, ExperimentRecord, HypothesisRecord } from "@situ/protocol";
import {
  DxBadge,
  DxSection,
  DxTable,
  type DxBadgeTone,
  type DxTableColumn,
} from "@situ/web-ui";
import { Link } from "@tanstack/react-router";
import filter from "lodash/filter";
import { EvaluationActivityList } from "../evidence/evaluation-activity-list";
import { evaluationsForExperiment } from "../evidence/evaluation-selectors";
import { ActivityTimeline } from "../shared/activity-timeline";
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
      <section className="situ-empty">
        <h2>Experiment not found</h2>
        <p>No experiment exists with id {experimentId}.</p>
      </section>
    );
  }

  const linkedHypotheses = hypothesesForExperiment({
    data,
    experimentId,
  });
  const activities = activitiesForExperiment({
    data,
    experimentId,
  });
  const artifacts = artifactsForExperiment({
    data,
    experimentId,
  });
  const evaluations = evaluationsForExperiment({
    data,
    experimentId,
  });
  const hasConcern = activities.some((activity) => activity.kind === "concern");

  return (
    <>
      <section className="situ-object-page">
        <div className="situ-object-page__header">
          <div>
            <p className="situ-object-page__eyebrow">{experiment.id}</p>
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
        <p className="situ-object-page__summary">{experiment.summary}</p>
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
        <div className="situ-record-cell">
          <Link
            className="situ-record-link"
            to="/projects/$projectId/hypotheses/$hypothesisId"
            params={{
              projectId,
              hypothesisId: row.hypothesis.id,
            }}
          >
            {row.hypothesis.title}
          </Link>
          <span className="situ-record-id">{row.hypothesis.id}</span>
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
        <div className="situ-record-cell">
          <span className="situ-record-link">{row.artifact.title}</span>
          <span className="situ-record-id">{row.artifact.id}</span>
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
      renderCell: ({ row }) => <span className="dx-mono">{row.artifact.path}</span>,
    },
  ];
}

function hypothesesForExperiment({
  data,
  experimentId,
}: {
  data: ProjectWorkspaceData;
  experimentId: string;
}): HypothesisRecord[] {
  const hypothesisIds = new Set(
    filter(
      data.hypothesisExperimentLinks,
      (link) => link.experiment_id === experimentId,
    ).map((link) => link.hypothesis_id),
  );

  return filter(data.hypotheses, (hypothesis) => hypothesisIds.has(hypothesis.id));
}

function activitiesForExperiment({
  data,
  experimentId,
}: {
  data: ProjectWorkspaceData;
  experimentId: string;
}): ActivityItem[] {
  return filter(
    data.experimentActivities,
    (activity) => activity.experiment_id === experimentId,
  ).map((activity) => ({
    id: `experiment-activity-${activity.id}`,
    actor: activity.actor,
    body: activity.body,
    kind: activity.payload?.activity_type ? String(activity.payload.activity_type) : activity.kind,
    createdAt: activity.created_at,
  }));
}

function artifactsForExperiment({
  data,
  experimentId,
}: {
  data: ProjectWorkspaceData;
  experimentId: string;
}): ArtifactRecord[] {
  return filter(
    data.artifacts,
    (artifact) =>
      artifact.associated_entity_kind === "experiment" &&
      artifact.associated_entity_id === experimentId,
  );
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
