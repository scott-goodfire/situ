import type {
  EvaluationRecord,
  ExperimentRecord,
  TaskRecord,
} from "@situ/protocol";
import orderBy from "lodash/orderBy";
import type { ProjectWorkspaceData } from "../../features/project-workspace/types";
import type {
  DashboardTask,
  DashboardTaskStatus,
  DashboardTone,
} from "./types";

export function dashboardTasks({
  data,
}: {
  data: ProjectWorkspaceData;
}): DashboardTask[] {
  if (data.tasks.length > 0) {
    const rows = data.tasks.map((task) => taskFromRecord({ task }));

    return orderBy(
      rows,
      [
        (task) => sortRankForStatus({ status: task.status }),
        (task) => sortRankForTone({ tone: task.tone }),
        (task) => task.title,
      ],
      ["asc", "asc", "asc"],
    );
  }

  const fromExperiments = data.experiments.map((experiment) =>
    taskFromExperiment({ experiment }),
  );
  const fromEvaluations = data.evaluations.map((evaluation) =>
    taskFromEvaluation({ evaluation }),
  );
  const fromHypotheses = data.hypotheses
    .filter(
      (hypothesis) =>
        hypothesis.status !== "canceled" && hypothesis.status !== "done",
    )
    .map(
      (hypothesis): DashboardTask => ({
        id: `hypothesis:${hypothesis.id}`,
        title: hypothesis.title,
        status: "todo",
        kind: "hypothesis",
        tone: "neutral",
      }),
    );

  return orderBy(
    [...fromExperiments, ...fromEvaluations, ...fromHypotheses],
    [
      (task) => sortRankForStatus({ status: task.status }),
      (task) => task.title,
    ],
    ["asc", "asc"],
  );
}

function taskFromRecord({ task }: { task: TaskRecord }): DashboardTask {
  return {
    id: `task:${task.id}`,
    title: task.title,
    status: statusForTaskRecord({ status: task.status }),
    kind: "task",
    tone: toneForTaskRecord({ task }),
  };
}

function statusForTaskRecord({
  status,
}: {
  status: TaskRecord["status"];
}): DashboardTaskStatus {
  if (status === "in_progress") {
    return "in-progress";
  }

  if (status === "done" || status === "canceled" || status === "failed") {
    return "done";
  }

  return "todo";
}

function toneForTaskRecord({ task }: { task: TaskRecord }): DashboardTone {
  if (task.status === "failed" || task.status === "canceled") {
    return "danger";
  }

  if (task.status === "done") {
    return "success";
  }

  if (task.priority === "urgent" || task.priority === "high") {
    return "warning";
  }

  return "neutral";
}

function taskFromExperiment({
  experiment,
}: {
  experiment: ExperimentRecord;
}): DashboardTask {
  return {
    id: `experiment:${experiment.id}`,
    title: experiment.title,
    status: statusForResearchRecord({ status: experiment.status }),
    kind: "experiment",
    tone: "neutral",
  };
}

function taskFromEvaluation({
  evaluation,
}: {
  evaluation: EvaluationRecord;
}): DashboardTask {
  return {
    id: `evaluation:${evaluation.id}`,
    title: evaluation.title,
    status: statusForResearchRecord({ status: evaluation.status }),
    kind: "evaluation",
    tone: "neutral",
  };
}

function statusForResearchRecord({
  status,
}: {
  status: ExperimentRecord["status"] | EvaluationRecord["status"];
}): DashboardTaskStatus {
  if (status === "active" || status === "in_review") {
    return "in-progress";
  }

  if (status === "done" || status === "canceled" || status === "failed") {
    return "done";
  }

  return "todo";
}

function sortRankForStatus({
  status,
}: {
  status: DashboardTaskStatus;
}): number {
  if (status === "in-progress") {
    return 0;
  }

  if (status === "todo") {
    return 1;
  }

  return 2;
}

function sortRankForTone({ tone }: { tone: DashboardTone }): number {
  if (tone === "danger") {
    return 0;
  }

  if (tone === "warning") {
    return 1;
  }

  return 2;
}
