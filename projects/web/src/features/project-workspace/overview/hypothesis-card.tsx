import type {
  EvaluationActivityRecord,
  EvaluationRecord,
  ExperimentRecord,
  HypothesisRecord,
} from "@almanac/protocol";
import { DxBadge, type DxBadgeTone } from "@almanac/web-ui";
import { Link } from "@tanstack/react-router";
import {
  evidenceState,
  evaluationActivitiesForEvaluations,
  evaluationsForExperiments,
  latestEvaluationActivity,
} from "../evidence/evaluation-selectors";
import type { ProjectWorkspaceData } from "../types";

export function HypothesisCard({
  data,
  hypothesis,
  experiments,
}: {
  data: ProjectWorkspaceData;
  hypothesis: HypothesisRecord;
  experiments: ExperimentRecord[];
}) {
  const evaluations = evaluationsForExperiments({
    data,
    experiments,
  });
  const activities = evaluationActivitiesForEvaluations({
    data,
    evaluations,
  });
  const currentExperiment = currentExperimentFor({
    experiments,
  });
  const agents = agentsForHypothesis({
    data,
    hypothesis,
    experiments,
    evaluations,
  });

  return (
    <article className="almanac-hypothesis-card">
      <header className="almanac-hypothesis-card__header">
        <div className="almanac-record-cell">
          <Link
            className="almanac-record-link"
            to="/projects/$projectId/hypotheses/$hypothesisId"
            params={{
              projectId: data.projectId,
              hypothesisId: hypothesis.id,
            }}
          >
            {hypothesis.title}
          </Link>
          <span className="almanac-record-id">{hypothesis.id}</span>
        </div>
        <DxBadge tone={statusTone({ status: hypothesis.status })}>
          {hypothesis.status}
        </DxBadge>
      </header>

      <p className="almanac-hypothesis-card__summary">{hypothesis.summary}</p>

      <PresenceLine
        agents={agents}
        experimentCount={experiments.length}
      />
      <EvidenceLine
        evaluations={evaluations}
        activities={activities}
      />
      <CurrentExperiment
        projectId={data.projectId}
        experiment={currentExperiment}
      />
    </article>
  );
}

function PresenceLine({
  agents,
  experimentCount,
}: {
  agents: string[];
  experimentCount: number;
}) {
  const label = (() => {
    if (agents.length > 0 && experimentCount > 0) {
      return `${agentsLabel({ agents })} / ${experimentCountLabel({ count: experimentCount })}`;
    }

    if (agents.length > 0) {
      return agentsLabel({ agents });
    }

    if (experimentCount > 0) {
      return experimentCountLabel({ count: experimentCount });
    }

    return "No active work yet";
  })();

  return <p className="almanac-hypothesis-card__detail">{label}</p>;
}

function EvidenceLine({
  evaluations,
  activities,
}: {
  evaluations: EvaluationRecord[];
  activities: EvaluationActivityRecord[];
}) {
  const latestActivity = latestEvaluationActivity({
    activities,
  });
  const state = evidenceState({
    evaluations,
    activities,
  });
  const label = (() => {
    if (state === "missing") {
      return "No evidence yet";
    }

    if (state === "waiting") {
      return "Evidence: waiting for result";
    }

    if (state === "concern") {
      return `Concern: ${latestActivity?.body ?? "needs review"}`;
    }

    return `Evidence: ${latestActivity?.body ?? "result recorded"}`;
  })();

  return <p className="almanac-hypothesis-card__evidence">{label}</p>;
}

function CurrentExperiment({
  projectId,
  experiment,
}: {
  projectId: string;
  experiment: ExperimentRecord | undefined;
}) {
  if (!experiment) {
    return null;
  }

  return (
    <div className="almanac-hypothesis-card__experiment">
      <span className="dx-mono">{experiment.status}</span>
      <Link
        className="almanac-record-link"
        to="/projects/$projectId/experiments/$experimentId"
        params={{
          projectId,
          experimentId: experiment.id,
        }}
      >
        {experiment.title}
      </Link>
    </div>
  );
}

function experimentCountLabel({
  count,
}: {
  count: number;
}): string {
  if (count === 1) {
    return "1 experiment";
  }

  return `${count} experiments`;
}

function agentsLabel({ agents }: { agents: string[] }): string {
  if (agents.length === 1) {
    return agents[0] ?? "agent";
  }

  if (agents.length === 2) {
    return `${agents[0]} + ${agents[1]}`;
  }

  return `${agents[0]} + ${agents.length - 1} more`;
}

function currentExperimentFor({
  experiments,
}: {
  experiments: ExperimentRecord[];
}): ExperimentRecord | undefined {
  return (
    experiments.find((experiment) => experiment.status === "active") ??
    experiments.at(-1)
  );
}

function agentsForHypothesis({
  data,
  hypothesis,
  experiments,
  evaluations,
}: {
  data: ProjectWorkspaceData;
  hypothesis: HypothesisRecord;
  experiments: ExperimentRecord[];
  evaluations: ReturnType<typeof evaluationsForExperiments>;
}): string[] {
  const experimentIds = new Set(experiments.map((experiment) => experiment.id));
  const evaluationIds = new Set(evaluations.map((evaluation) => evaluation.id));
  const agents = new Set<string>();

  for (const activity of data.hypothesisActivities) {
    if (activity.hypothesis_id === hypothesis.id) {
      agents.add(activity.actor);
    }
  }

  for (const activity of data.experimentActivities) {
    if (experimentIds.has(activity.experiment_id)) {
      agents.add(activity.actor);
    }
  }

  for (const activity of data.evaluationActivities) {
    if (evaluationIds.has(activity.evaluation_id)) {
      agents.add(activity.actor);
    }
  }

  return Array.from(agents).sort((left, right) => left.localeCompare(right));
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
