import type { ExperimentRecord, HypothesisRecord } from "@situ/protocol";
import {
  DxBadge,
  DxSection,
  DxTable,
  type DxBadgeTone,
  type DxTableColumn,
} from "@situ/web-ui";
import { Link } from "@tanstack/react-router";
import filter from "lodash/filter";
import { EvidenceSummary } from "../evidence/evidence-summary";
import {
  evaluationActivitiesForEvaluations,
  evaluationsForExperiment,
} from "../evidence/evaluation-selectors";
import { experimentsForHypothesis } from "../shared/relationship-selectors";
import { ActivityTimeline } from "../shared/activity-timeline";
import type { ActivityItem, ProjectWorkspaceData } from "../types";

type LinkedExperimentRow = {
  experiment: ExperimentRecord;
};

export function HypothesisDetailPage({
  data,
  hypothesisId,
}: {
  data: ProjectWorkspaceData;
  hypothesisId: string;
}) {
  const hypothesis = data.hypotheses.find((record) => record.id === hypothesisId);

  if (!hypothesis) {
    return (
      <section className="situ-empty">
        <h2>Hypothesis not found</h2>
        <p>No hypothesis exists with id {hypothesisId}.</p>
      </section>
    );
  }

  const linkedExperiments = experimentsForHypothesis({
    data,
    hypothesisId,
  });
  const activities = activitiesForHypothesis({
    data,
    hypothesisId,
  });

  return (
    <>
      <section className="situ-object-page">
        <div className="situ-object-page__header">
          <div>
            <p className="situ-object-page__eyebrow">{hypothesis.id}</p>
            <h2>{hypothesis.title}</h2>
          </div>
          <DxBadge tone={statusTone({ status: hypothesis.status })}>
            {hypothesis.status}
          </DxBadge>
        </div>
        <p className="situ-object-page__summary">{hypothesis.summary}</p>
      </section>

      <LinkedExperiments
        data={data}
        projectId={data.projectId}
        experiments={linkedExperiments}
      />
      <ActivityTimeline
        title="Activity"
        activities={activities}
        emptyLabel="No hypothesis activity yet"
      />
    </>
  );
}

function LinkedExperiments({
  data,
  projectId,
  experiments,
}: {
  data: ProjectWorkspaceData;
  projectId: string;
  experiments: ExperimentRecord[];
}) {
  const columns = linkedExperimentColumns({ data, projectId });
  const rows = experiments.map((experiment) => ({ experiment }));

  return (
    <DxSection title="Linked Experiments">
      <DxTable
        columns={columns}
        rows={rows}
        getRowKey={({ row }) => row.experiment.id}
        emptyLabel="No linked experiments yet"
        density="compact"
        stickyHeader
      />
    </DxSection>
  );
}

function linkedExperimentColumns({
  data,
  projectId,
}: {
  data: ProjectWorkspaceData;
  projectId: string;
}): Array<DxTableColumn<LinkedExperimentRow>> {
  return [
    {
      id: "experiment",
      header: "Experiment",
      width: "34%",
      renderCell: ({ row }) => (
        <div className="situ-record-cell">
          <Link
            className="situ-record-link"
            to="/projects/$projectId/experiments/$experimentId"
            params={{
              projectId,
              experimentId: row.experiment.id,
            }}
          >
            {row.experiment.title}
          </Link>
          <span className="situ-record-id">{row.experiment.id}</span>
        </div>
      ),
    },
    {
      id: "status",
      header: "Status",
      width: "120px",
      renderCell: ({ row }) => <DxBadge>{row.experiment.status}</DxBadge>,
    },
    {
      id: "summary",
      header: "Summary",
      renderCell: ({ row }) => row.experiment.summary,
    },
    {
      id: "evidence",
      header: "Evidence",
      width: "260px",
      renderCell: ({ row }) => {
        const evaluations = evaluationsForExperiment({
          data,
          experimentId: row.experiment.id,
        });
        const activities = evaluationActivitiesForEvaluations({
          data,
          evaluations,
        });

        return (
          <EvidenceSummary
            evaluations={evaluations}
            activities={activities}
            missingLabel="No evidence yet"
          />
        );
      },
    },
  ];
}

function activitiesForHypothesis({
  data,
  hypothesisId,
}: {
  data: ProjectWorkspaceData;
  hypothesisId: string;
}): ActivityItem[] {
  return filter(
    data.hypothesisActivities,
    (activity) => activity.hypothesis_id === hypothesisId,
  ).map((activity) => ({
    id: `hypothesis-activity-${activity.id}`,
    actor: activity.actor,
    body: activity.body,
    kind: activity.payload?.activity_type ? String(activity.payload.activity_type) : activity.kind,
    createdAt: activity.created_at,
  }));
}

function statusTone({
  status,
}: {
  status: HypothesisRecord["status"];
}): DxBadgeTone {
  if (status === "active") {
    return "success";
  }

  if (status === "closed") {
    return "neutral";
  }

  return "warning";
}
