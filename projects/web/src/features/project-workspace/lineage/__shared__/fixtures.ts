import type {
  EvaluationActivityRecord,
  EvaluationRecord,
  ExperimentActivityRecord,
  ExperimentRecord,
  HypothesisExperimentLinkRecord,
  HypothesisRecord,
  TaskEntityLinkRecord,
  TaskRecord,
} from "@situ/protocol";
import type { ProjectWorkspaceData } from "../../types";

export function buildLineageFixture({
  experiments = [],
  hypotheses = [],
  hypothesisExperimentLinks = [],
  experimentActivities = [],
  evaluations = [],
  evaluationActivities = [],
  tasks = [],
  taskEntityLinks = [],
}: {
  experiments?: ExperimentRecord[];
  hypotheses?: HypothesisRecord[];
  hypothesisExperimentLinks?: HypothesisExperimentLinkRecord[];
  experimentActivities?: ExperimentActivityRecord[];
  evaluations?: EvaluationRecord[];
  evaluationActivities?: EvaluationActivityRecord[];
  tasks?: TaskRecord[];
  taskEntityLinks?: TaskEntityLinkRecord[];
} = {}): ProjectWorkspaceData {
  return {
    projectId: "P1",
    activeProjectRecordId: "P1",
    workspace: "support-agent-demo",
    connection: { kind: "connected" },
    project: undefined,
    sessions: [],
    hypotheses,
    experiments,
    evaluations,
    analyses: [],
    agents: [],
    tasks,
    taskDependencies: [],
    taskEntityLinks,
    taskActivities: [],
    analysisActivities: [],
    hypothesisExperimentLinks,
    hypothesisActivities: [],
    experimentActivities,
    evaluationActivities,
    artifacts: [],
    events: [],
  };
}

export function makeExperiment({
  id,
  parentId = null,
  status = "closed",
  title,
  summary = "",
  baseCommit,
  candidateCommit,
  thread,
  t,
}: {
  id: string;
  parentId?: string | null;
  status?: ExperimentRecord["status"];
  title: string;
  summary?: string;
  baseCommit?: string;
  candidateCommit?: string;
  thread?: string;
  t: number;
}): ExperimentRecord {
  const created = isoAt({ minute: t });
  return {
    id,
    project_id: "P1",
    status,
    title,
    summary,
    parent_experiment_id: parentId,
    base_commit: baseCommit ?? null,
    candidate_commit: candidateCommit ?? null,
    research_thread: thread ?? null,
    created_at: created,
    updated_at: created,
  };
}

export function makeHypothesis({
  id,
  title,
  summary = "",
  status = "active",
}: {
  id: string;
  title: string;
  summary?: string;
  status?: HypothesisRecord["status"];
}): HypothesisRecord {
  const created = isoAt({ minute: 0 });
  return {
    id,
    project_id: "P1",
    title,
    summary,
    status,
    created_at: created,
    updated_at: created,
  };
}

export function makeHypLink({
  hypothesisId,
  experimentId,
}: {
  hypothesisId: string;
  experimentId: string;
}): HypothesisExperimentLinkRecord {
  return {
    hypothesis_id: hypothesisId,
    experiment_id: experimentId,
    created_at: isoAt({ minute: 0 }),
  };
}

let activityCounter = 1;

export function makeExperimentActivity({
  experimentId,
  body,
  activityType,
  actor = "critic",
  t,
}: {
  experimentId: string;
  body: string;
  activityType: "critic_review" | "concern" | "comment";
  actor?: string;
  t: number;
}): ExperimentActivityRecord {
  return {
    id: activityCounter++,
    experiment_id: experimentId,
    actor,
    kind: "comment",
    body,
    payload: { activity_type: activityType },
    created_at: isoAt({ minute: t }),
  };
}

export function makeEvaluation({
  id,
  experimentId,
  title,
  summary = "",
  status = "closed",
  t,
}: {
  id: string;
  experimentId: string;
  title: string;
  summary?: string;
  status?: EvaluationRecord["status"];
  t: number;
}): EvaluationRecord {
  return {
    id,
    project_id: "P1",
    status,
    title,
    summary,
    associated_baseline_id: null,
    associated_experiment_id: experimentId,
    created_at: isoAt({ minute: t }),
    updated_at: isoAt({ minute: t }),
  };
}

let evalActivityCounter = 1;

export function makeEvaluationActivity({
  evaluationId,
  body,
  activityType = "result",
  actor = "scientist",
  t,
}: {
  evaluationId: string;
  body: string;
  activityType?: string;
  actor?: string;
  t: number;
}): EvaluationActivityRecord {
  return {
    id: evalActivityCounter++,
    evaluation_id: evaluationId,
    actor,
    kind: "result",
    body,
    payload: { activity_type: activityType },
    created_at: isoAt({ minute: t }),
  };
}

export function makeFailedExperimentTask({
  id,
  experimentId,
}: {
  id: string;
  experimentId: string;
}): { task: TaskRecord; link: TaskEntityLinkRecord } {
  const t = isoAt({ minute: 0 });
  return {
    task: {
      id,
      project_id: "P1",
      title: `Run experiment ${experimentId}`,
      content: "",
      kind: "experiment",
      status: "failed",
      priority: "normal",
      source_kind: "manager",
      payload: {},
      created_at: t,
      available_at: t,
      updated_at: t,
    },
    link: {
      project_id: "P1",
      task_id: id,
      entity_kind: "experiment",
      entity_id: experimentId,
      relationship: "produced",
      created_at: t,
    },
  };
}

function isoAt({ minute }: { minute: number }): string {
  return new Date(Date.UTC(2026, 0, 1, 12, minute, 0)).toISOString();
}
