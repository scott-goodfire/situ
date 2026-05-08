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

// ---------------------------------------------------------------------------
// Bigger preset fixtures — long realistic run + wide parallel branches.
// These exercise lane assignment, edge routing, and panel layout at scale.
// ---------------------------------------------------------------------------

export function buildLongRunFixture(): ProjectWorkspaceData {
  const experiments = [
    makeExperiment({ id: "EX1", title: "Baseline run", status: "closed", t: 1 }),
    makeExperiment({
      id: "EX2",
      parentId: "EX1",
      title: "MLP width 64 → 128",
      status: "closed",
      t: 2,
    }),
    makeExperiment({
      id: "EX3",
      parentId: "EX1",
      title: "Aggressive dropout (probe)",
      status: "active",
      t: 3,
    }),
    makeExperiment({
      id: "EX4",
      parentId: "EX2",
      title: "EX2 + dropout 0.1",
      status: "closed",
      t: 4,
    }),
    makeExperiment({
      id: "EX5",
      parentId: "EX2",
      title: "EX2 + label smoothing",
      status: "closed",
      t: 5,
    }),
    makeExperiment({
      id: "EX6",
      parentId: "EX4",
      title: "EX4 + cosine LR",
      status: "closed",
      t: 6,
    }),
    makeExperiment({
      id: "EX7",
      parentId: "EX1",
      title: "Optimizer sweep (Adam vs SGD)",
      status: "closed",
      t: 7,
    }),
    makeExperiment({
      id: "EX8",
      parentId: "EX6",
      title: "EX6 + EMA on weights",
      status: "closed",
      t: 8,
    }),
    makeExperiment({
      id: "EX9",
      parentId: "EX5",
      title: "EX5 + warmup",
      status: "active",
      t: 9,
    }),
    makeExperiment({
      id: "EX10",
      parentId: "EX8",
      title: "EX8 + longer training",
      status: "closed",
      t: 10,
    }),
    makeExperiment({
      id: "EX11",
      parentId: "EX7",
      title: "Adam + lr=3e-4 floor",
      status: "active",
      t: 11,
    }),
    makeExperiment({
      id: "EX12",
      parentId: "EX10",
      title: "EX10 + dropout 0.15",
      status: "active",
      t: 12,
    }),
    makeExperiment({
      id: "EX13",
      parentId: "EX10",
      title: "EX10 + grad clipping",
      status: "active",
      t: 13,
    }),
    makeExperiment({
      id: "EX14",
      parentId: "EX12",
      title: "Combined: best-of A + C",
      status: "active",
      t: 14,
    }),
  ];

  const failedTask = makeFailedExperimentTask({ id: "T9", experimentId: "EX3" });

  return buildLineageFixture({
    experiments,
    hypotheses: [
      makeHypothesis({ id: "H1", title: "Capacity bottleneck" }),
      makeHypothesis({ id: "H2", title: "Regularization story" }),
      makeHypothesis({ id: "H3", title: "LR schedule matters" }),
      makeHypothesis({ id: "H4", title: "Optimizer choice" }),
    ],
    hypothesisExperimentLinks: [
      makeHypLink({ hypothesisId: "H1", experimentId: "EX2" }),
      makeHypLink({ hypothesisId: "H2", experimentId: "EX3" }),
      makeHypLink({ hypothesisId: "H1", experimentId: "EX4" }),
      makeHypLink({ hypothesisId: "H2", experimentId: "EX4" }),
      makeHypLink({ hypothesisId: "H2", experimentId: "EX5" }),
      makeHypLink({ hypothesisId: "H1", experimentId: "EX6" }),
      makeHypLink({ hypothesisId: "H3", experimentId: "EX6" }),
      makeHypLink({ hypothesisId: "H4", experimentId: "EX7" }),
      makeHypLink({ hypothesisId: "H1", experimentId: "EX8" }),
      makeHypLink({ hypothesisId: "H3", experimentId: "EX8" }),
      makeHypLink({ hypothesisId: "H3", experimentId: "EX9" }),
      makeHypLink({ hypothesisId: "H1", experimentId: "EX10" }),
      makeHypLink({ hypothesisId: "H4", experimentId: "EX11" }),
      makeHypLink({ hypothesisId: "H2", experimentId: "EX12" }),
      makeHypLink({ hypothesisId: "H1", experimentId: "EX13" }),
      makeHypLink({ hypothesisId: "H1", experimentId: "EX14" }),
      makeHypLink({ hypothesisId: "H3", experimentId: "EX14" }),
    ],
    experimentActivities: [
      makeExperimentActivity({
        experimentId: "EX2",
        body: "Approved by Critic.",
        activityType: "critic_review",
        t: 2,
      }),
      makeExperimentActivity({
        experimentId: "EX3",
        body: "Concern: dropout sweep depends on confound.",
        activityType: "concern",
        t: 3,
      }),
      makeExperimentActivity({
        experimentId: "EX4",
        body: "Approved.",
        activityType: "critic_review",
        t: 4,
      }),
      makeExperimentActivity({
        experimentId: "EX5",
        body: "Approved.",
        activityType: "critic_review",
        t: 5,
      }),
      makeExperimentActivity({
        experimentId: "EX6",
        body: "Approved with caveat.",
        activityType: "critic_review",
        t: 6,
      }),
      makeExperimentActivity({
        experimentId: "EX7",
        body: "Approved.",
        activityType: "critic_review",
        t: 7,
      }),
      makeExperimentActivity({
        experimentId: "EX8",
        body: "Critic: best result so far in this thread.",
        activityType: "critic_review",
        t: 8,
      }),
      makeExperimentActivity({
        experimentId: "EX10",
        body: "Approved.",
        activityType: "critic_review",
        t: 10,
      }),
      makeExperimentActivity({
        experimentId: "EX13",
        body: "Concern: late-epoch variance climbed; revisit.",
        activityType: "concern",
        t: 13,
      }),
    ],
    evaluations: [
      makeEvaluation({ id: "EV10a", experimentId: "EX10", title: "Dev accuracy", t: 10 }),
      makeEvaluation({ id: "EV10b", experimentId: "EX10", title: "Held-out accuracy", t: 10 }),
      makeEvaluation({ id: "EV14a", experimentId: "EX14", title: "Dev accuracy", t: 14 }),
    ],
    evaluationActivities: [
      makeEvaluationActivity({
        evaluationId: "EV10a",
        body: "acc=0.712, +0.024 vs EX8",
        t: 10,
      }),
      makeEvaluationActivity({
        evaluationId: "EV10b",
        body: "acc=0.694, +0.018 vs EX8",
        t: 10,
      }),
      makeEvaluationActivity({
        evaluationId: "EV14a",
        body: "acc=0.718, +0.006 vs EX10",
        t: 14,
      }),
    ],
    tasks: [failedTask.task],
    taskEntityLinks: [failedTask.link],
  });
}

export function buildWideBranchFixture(): ProjectWorkspaceData {
  // One baseline → 5 distinct first-level threads → each thread has children.
  // Forces the layout to allocate ≥5 lanes simultaneously.
  const experiments = [
    makeExperiment({ id: "EX1", title: "Baseline run", status: "closed", t: 1 }),
    // Five sibling probes off baseline
    makeExperiment({
      id: "EX2",
      parentId: "EX1",
      title: "Architecture probe",
      status: "closed",
      thread: "architecture",
      t: 2,
    }),
    makeExperiment({
      id: "EX3",
      parentId: "EX1",
      title: "Regularization probe",
      status: "closed",
      thread: "regularization",
      t: 3,
    }),
    makeExperiment({
      id: "EX4",
      parentId: "EX1",
      title: "Optimizer probe",
      status: "closed",
      thread: "optimizer",
      t: 4,
    }),
    makeExperiment({
      id: "EX5",
      parentId: "EX1",
      title: "Schedule probe",
      status: "active",
      thread: "schedule",
      t: 5,
    }),
    makeExperiment({
      id: "EX6",
      parentId: "EX1",
      title: "Data augmentation probe",
      status: "active",
      thread: "data",
      t: 6,
    }),
    // Children of each probe
    makeExperiment({
      id: "EX7",
      parentId: "EX2",
      title: "Wider MLP",
      status: "closed",
      thread: "architecture",
      t: 7,
    }),
    makeExperiment({
      id: "EX8",
      parentId: "EX3",
      title: "Stronger dropout",
      status: "closed",
      thread: "regularization",
      t: 8,
    }),
    makeExperiment({
      id: "EX9",
      parentId: "EX4",
      title: "AdamW",
      status: "closed",
      thread: "optimizer",
      t: 9,
    }),
    makeExperiment({
      id: "EX10",
      parentId: "EX5",
      title: "Cosine annealing",
      status: "active",
      thread: "schedule",
      t: 10,
    }),
    makeExperiment({
      id: "EX11",
      parentId: "EX6",
      title: "Random crop + flip",
      status: "active",
      thread: "data",
      t: 11,
    }),
    // Second-level deeper picks
    makeExperiment({
      id: "EX12",
      parentId: "EX7",
      title: "Wider MLP + LayerNorm",
      status: "active",
      thread: "architecture",
      t: 12,
    }),
    makeExperiment({
      id: "EX13",
      parentId: "EX9",
      title: "AdamW + decoupled wd",
      status: "active",
      thread: "optimizer",
      t: 13,
    }),
    makeExperiment({
      id: "EX14",
      parentId: "EX10",
      title: "Cosine + warmup",
      status: "active",
      thread: "schedule",
      t: 14,
    }),
  ];

  const failedTask = makeFailedExperimentTask({ id: "T20", experimentId: "EX8" });

  return buildLineageFixture({
    experiments,
    hypotheses: [
      makeHypothesis({ id: "H1", title: "Capacity bottleneck" }),
      makeHypothesis({ id: "H2", title: "Regularization story" }),
      makeHypothesis({ id: "H3", title: "Optimizer choice" }),
      makeHypothesis({ id: "H4", title: "LR schedule matters" }),
      makeHypothesis({ id: "H5", title: "Data augmentation gap" }),
    ],
    hypothesisExperimentLinks: [
      makeHypLink({ hypothesisId: "H1", experimentId: "EX2" }),
      makeHypLink({ hypothesisId: "H2", experimentId: "EX3" }),
      makeHypLink({ hypothesisId: "H3", experimentId: "EX4" }),
      makeHypLink({ hypothesisId: "H4", experimentId: "EX5" }),
      makeHypLink({ hypothesisId: "H5", experimentId: "EX6" }),
      makeHypLink({ hypothesisId: "H1", experimentId: "EX7" }),
      makeHypLink({ hypothesisId: "H2", experimentId: "EX8" }),
      makeHypLink({ hypothesisId: "H3", experimentId: "EX9" }),
      makeHypLink({ hypothesisId: "H4", experimentId: "EX10" }),
      makeHypLink({ hypothesisId: "H5", experimentId: "EX11" }),
      makeHypLink({ hypothesisId: "H1", experimentId: "EX12" }),
      makeHypLink({ hypothesisId: "H3", experimentId: "EX13" }),
      makeHypLink({ hypothesisId: "H4", experimentId: "EX14" }),
    ],
    experimentActivities: [
      makeExperimentActivity({
        experimentId: "EX2",
        body: "Approved.",
        activityType: "critic_review",
        t: 2,
      }),
      makeExperimentActivity({
        experimentId: "EX3",
        body: "Approved.",
        activityType: "critic_review",
        t: 3,
      }),
      makeExperimentActivity({
        experimentId: "EX4",
        body: "Approved.",
        activityType: "critic_review",
        t: 4,
      }),
      makeExperimentActivity({
        experimentId: "EX7",
        body: "Approved.",
        activityType: "critic_review",
        t: 7,
      }),
      makeExperimentActivity({
        experimentId: "EX8",
        body: "Concern: dropout amount confounded with LR.",
        activityType: "concern",
        t: 8,
      }),
      makeExperimentActivity({
        experimentId: "EX9",
        body: "Approved.",
        activityType: "critic_review",
        t: 9,
      }),
    ],
    tasks: [failedTask.task],
    taskEntityLinks: [failedTask.link],
  });
}
