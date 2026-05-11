export type TinyAutoresearchSeedName =
  | "empty_repo"
  | "needs_baseline"
  | "with_baseline_result"
  | "with_candidate_result"
  | "comparability_break"
  | "large_search_ridge";

export type TinyAutoresearchResearchStatus =
  | "triage"
  | "accepted"
  | "active"
  | "in_review"
  | "done"
  | "canceled"
  | "failed";

export type TinyAutoresearchResearchProjectSeed = Readonly<{
  id: string;
  goal: string;
  phase: "onboarding" | "search" | "reporting" | "complete";
  status: "active" | "blocked_on_user" | "complete" | "failed" | "canceled";
  baselineSummary: string | null;
  resultSummary: string | null;
  createdByAgentId: string | null;
  payload: Record<string, unknown>;
}>;

export type TinyAutoresearchResearchTaskType =
  | "explore"
  | "exploit"
  | "debug"
  | "verify"
  | "synthesize"
  | "prune";

export type TinyAutoresearchMetricDirection =
  | "higher_is_better"
  | "lower_is_better"
  | "target"
  | "informational";

export type TinyAutoresearchMetricValue = Readonly<{
  value: boolean | number | string;
  unit?: string;
  direction?: TinyAutoresearchMetricDirection;
  notes?: string;
}>;

export type TinyAutoresearchClaudeAgentSeed = Readonly<{
  id: string;
  kind: "manager" | "scientist" | "verifier";
  displayName: string;
  status: "idle" | "active" | "closed";
}>;

export type TinyAutoresearchResearchTaskSeed = Readonly<{
  id: string;
  researchProjectId: string;
  parentResearchTaskId: string | null;
  type: TinyAutoresearchResearchTaskType;
  title: string;
  workerPrompt: string;
  verificationPrompt: string;
  status:
    | "planned"
    | "running"
    | "awaiting_verification"
    | "verified"
    | "rejected"
    | "pruned"
    | "failed"
    | "canceled";
  priority: "urgent" | "high" | "normal" | "low";
  createdByAgentId: string | null;
  resultSummary: string | null;
  targetKind: string | null;
  targetId: string | null;
  payload: Record<string, unknown>;
}>;

export type TinyAutoresearchResearchRecordSeed = Readonly<{
  id: string;
  createdByResearchTaskId: string | null;
  createdByAgentId: string | null;
  title: string;
  summary: string;
  status: TinyAutoresearchResearchStatus;
}>;

export type TinyAutoresearchExperimentSeed = TinyAutoresearchResearchRecordSeed &
  Readonly<{
    associatedHypothesisId: string;
    parentExperimentId: string | null;
    worktreePath: string | null;
    baseCommit: string | null;
    candidateCommit: string | null;
  }>;

export type TinyAutoresearchEvaluationSeed = TinyAutoresearchResearchRecordSeed &
  Readonly<{
    associatedBaselineId: string | null;
    associatedExperimentId: string | null;
  }>;

export type TinyAutoresearchMeasurementSeed = Readonly<{
  id: string;
  createdByResearchTaskId: string | null;
  createdByAgentId: string | null;
  evaluationId: string;
  actor: string;
  body: string;
  payload: Record<string, unknown> & {
    activityType: string;
    measurementType: string;
    command: string;
    metrics: Record<string, TinyAutoresearchMetricValue>;
    rawOutputSummary: string;
    comparisonBaselineId?: string;
    comparisonMeasurementId?: string;
    comparisonMetricDeltas?: Record<string, TinyAutoresearchMetricValue>;
  };
}>;

export type TinyAutoresearchArtifactSeed = Readonly<{
  id: string;
  createdByResearchTaskId: string | null;
  createdByAgentId: string | null;
  entityKind: string;
  entityId: string;
  kind: string;
  title: string;
  path: string;
  mediaType: string | null;
  sizeBytes: number | null;
}>;

export type TinyAutoresearchEntityLinkSeed = Readonly<{
  id: string;
  fromKind: string;
  fromId: string;
  toKind: string;
  toId: string;
  relationship: string;
}>;

export type TinyAutoresearchActivitySeed = Readonly<{
  table:
    | "hypothesis_activities"
    | "experiment_activities"
    | "baseline_activities"
    | "evaluation_activities";
  entityId: string;
  actorAgentId: string | null;
  actor: string;
  kind: string;
  body: string;
  payload: Record<string, unknown>;
}>;

export type TinyAutoresearchAppEventSeed = Readonly<{
  type: string;
  message: string;
  payload: Record<string, unknown>;
}>;

export type TinyAutoresearchSeedRecords = Readonly<{
  claudeAgents: TinyAutoresearchClaudeAgentSeed[];
  researchProjects: TinyAutoresearchResearchProjectSeed[];
  researchTasks: TinyAutoresearchResearchTaskSeed[];
  hypotheses: TinyAutoresearchResearchRecordSeed[];
  baselines: TinyAutoresearchResearchRecordSeed[];
  experiments: TinyAutoresearchExperimentSeed[];
  evaluations: TinyAutoresearchEvaluationSeed[];
  measurements: TinyAutoresearchMeasurementSeed[];
  artifacts: TinyAutoresearchArtifactSeed[];
  entityLinks: TinyAutoresearchEntityLinkSeed[];
  activities: TinyAutoresearchActivitySeed[];
  appEvents: TinyAutoresearchAppEventSeed[];
}>;

export const TINY_AUTORESEARCH_IDS = {
  managerAgent: "agent_tiny_manager",
  scientistAgent: "agent_tiny_scientist",
  verifierAgent: "agent_tiny_verifier",
  researchProject: "research_project_tiny",
  planTask: "research_task_tiny_plan",
  baselineTask: "research_task_tiny_baseline",
  experimentTask: "research_task_tiny_experiment_component_a",
  verificationTask: "research_task_tiny_verification",
  taskVerification: "research_task_verification_tiny_comparability",
  hypothesis: "H1",
  baseline: "B1",
  baselineEvaluation: "EV1",
  baselineMeasurement: "M1",
  baselineArtifact: "A1",
  candidateExperiment: "EX1",
  candidateEvaluation: "EV2",
  candidateMeasurement: "M2",
  candidateArtifact: "A2",
  comparabilityExperiment: "EX_BAD1",
  comparabilityEvaluation: "EV_BAD1",
  comparabilityMeasurement: "M_BAD1",
  comparabilityArtifact: "A_BAD1",
  candidateHypothesisLink: "L1",
  comparabilityHypothesisLink: "L_BAD1",
} as const;

const agents: TinyAutoresearchClaudeAgentSeed[] = [
  {
    id: TINY_AUTORESEARCH_IDS.managerAgent,
    kind: "manager",
    displayName: "situ Manager",
    status: "idle",
  },
  {
    id: TINY_AUTORESEARCH_IDS.scientistAgent,
    kind: "scientist",
    displayName: "situ Scientist",
    status: "idle",
  },
  {
    id: TINY_AUTORESEARCH_IDS.verifierAgent,
    kind: "verifier",
    displayName: "situ Verifier",
    status: "idle",
  },
];

const researchProject: TinyAutoresearchResearchProjectSeed = {
  id: TINY_AUTORESEARCH_IDS.researchProject,
  goal: "Compare narrow training variants without changing the evaluation surface.",
  phase: "search",
  status: "blocked_on_user",
  baselineSummary: "Use python train.py as the project-native measurement command.",
  resultSummary: null,
  createdByAgentId: TINY_AUTORESEARCH_IDS.managerAgent,
  payload: {
    fixture: "tiny-autoresearch",
  },
};

const planTask: TinyAutoresearchResearchTaskSeed = {
  id: TINY_AUTORESEARCH_IDS.planTask,
  researchProjectId: TINY_AUTORESEARCH_IDS.researchProject,
  parentResearchTaskId: null,
  type: "explore",
  title: "Inspect tiny autoresearch repo",
  workerPrompt: "Inspect the repo and identify the project-native measurement command.",
  verificationPrompt:
    "Verify the task tree has a baseline task before candidate experiments begin.",
  status: "verified",
  priority: "high",
  createdByAgentId: TINY_AUTORESEARCH_IDS.managerAgent,
  resultSummary: "The repo measures val_bpb with python train.py.",
  targetKind: null,
  targetId: null,
  payload: {
    researchProject: TINY_AUTORESEARCH_IDS.researchProject,
  },
};

const baselineTask: TinyAutoresearchResearchTaskSeed = {
  id: TINY_AUTORESEARCH_IDS.baselineTask,
  researchProjectId: TINY_AUTORESEARCH_IDS.researchProject,
  parentResearchTaskId: TINY_AUTORESEARCH_IDS.planTask,
  type: "explore",
  title: "Record reference val_bpb",
  workerPrompt: "Run python train.py on the unmodified repo and record stdout.",
  verificationPrompt:
    "Confirm the baseline measurement includes command metadata and raw output evidence.",
  status: "verified",
  priority: "high",
  createdByAgentId: TINY_AUTORESEARCH_IDS.scientistAgent,
  resultSummary: "Baseline output recorded val_bpb=2.713 with status ok.",
  targetKind: null,
  targetId: null,
  payload: {
    command: "python train.py",
  },
};

const experimentTask: TinyAutoresearchResearchTaskSeed = {
  id: TINY_AUTORESEARCH_IDS.experimentTask,
  researchProjectId: TINY_AUTORESEARCH_IDS.researchProject,
  parentResearchTaskId: TINY_AUTORESEARCH_IDS.baselineTask,
  type: "exploit",
  title: "Try component A",
  workerPrompt:
    'Change only train.py so COMPONENT becomes "component_a", then run python train.py.',
  verificationPrompt:
    "Compare against the baseline and confirm the evaluation surface was not changed.",
  status: "verified",
  priority: "normal",
  createdByAgentId: TINY_AUTORESEARCH_IDS.scientistAgent,
  resultSummary: "Component A improved val_bpb by 0.032 without touching prepare.py.",
  targetKind: "hypothesis",
  targetId: TINY_AUTORESEARCH_IDS.hypothesis,
  payload: {
    changedFiles: ["train.py"],
    command: "python train.py",
  },
};

const verificationTask: TinyAutoresearchResearchTaskSeed = {
  id: TINY_AUTORESEARCH_IDS.verificationTask,
  researchProjectId: TINY_AUTORESEARCH_IDS.researchProject,
  parentResearchTaskId: TINY_AUTORESEARCH_IDS.experimentTask,
  type: "verify",
  title: "Verify suspicious candidate",
  workerPrompt: "Inspect the candidate result and evidence for comparability concerns.",
  verificationPrompt: "Record a ResearchTaskVerification that flags evaluation-surface changes.",
  status: "rejected",
  priority: "high",
  createdByAgentId: TINY_AUTORESEARCH_IDS.verifierAgent,
  resultSummary:
    "Rejected suspicious candidate because it changed prepare.py and invalidated comparability.",
  targetKind: "experiment",
  targetId: TINY_AUTORESEARCH_IDS.comparabilityExperiment,
  payload: {
    focus: "comparability",
  },
};

const hypothesis: TinyAutoresearchResearchRecordSeed = {
  id: TINY_AUTORESEARCH_IDS.hypothesis,
  createdByResearchTaskId: TINY_AUTORESEARCH_IDS.planTask,
  createdByAgentId: TINY_AUTORESEARCH_IDS.managerAgent,
  title: "Component choice affects validation bits per byte",
  summary:
    "Changing the training component while preserving the evaluation surface can lower val_bpb.",
  status: "active",
};

const baseline: TinyAutoresearchResearchRecordSeed = {
  id: TINY_AUTORESEARCH_IDS.baseline,
  createdByResearchTaskId: TINY_AUTORESEARCH_IDS.baselineTask,
  createdByAgentId: TINY_AUTORESEARCH_IDS.scientistAgent,
  title: "Reference train.py measurement",
  summary: "Unmodified train.py reports val_bpb=2.713.",
  status: "accepted",
};

const baselineEvaluation: TinyAutoresearchEvaluationSeed = {
  id: TINY_AUTORESEARCH_IDS.baselineEvaluation,
  createdByResearchTaskId: TINY_AUTORESEARCH_IDS.baselineTask,
  createdByAgentId: TINY_AUTORESEARCH_IDS.scientistAgent,
  title: "Baseline measurement plan",
  summary: "Run python train.py before candidate changes.",
  status: "done",
  associatedBaselineId: TINY_AUTORESEARCH_IDS.baseline,
  associatedExperimentId: null,
};

const baselineMeasurement: TinyAutoresearchMeasurementSeed = {
  id: TINY_AUTORESEARCH_IDS.baselineMeasurement,
  createdByResearchTaskId: TINY_AUTORESEARCH_IDS.baselineTask,
  createdByAgentId: TINY_AUTORESEARCH_IDS.scientistAgent,
  evaluationId: TINY_AUTORESEARCH_IDS.baselineEvaluation,
  actor: "scientist",
  body: "python train.py printed component=baseline, val_bpb=2.713, train_time_s=0.18, status=ok.",
  payload: {
    activityType: "measurement_recorded",
    measurementType: "command_output",
    command: "python train.py",
    metrics: {
      val_bpb: {
        value: 2.713,
        direction: "lower_is_better",
        notes: "Validation bits per byte from the fixture command.",
      },
      train_time_s: {
        value: 0.18,
        unit: "s",
        direction: "informational",
      },
    },
    rawOutputSummary: "component: baseline\nval_bpb: 2.713\ntrain_time_s: 0.18\nstatus: ok",
  },
};

const baselineArtifact: TinyAutoresearchArtifactSeed = {
  id: TINY_AUTORESEARCH_IDS.baselineArtifact,
  createdByResearchTaskId: TINY_AUTORESEARCH_IDS.baselineTask,
  createdByAgentId: TINY_AUTORESEARCH_IDS.scientistAgent,
  entityKind: "evaluation",
  entityId: TINY_AUTORESEARCH_IDS.baselineEvaluation,
  kind: "stdout",
  title: "Baseline command output",
  path: "artifacts/baseline-train-output.txt",
  mediaType: "text/plain",
  sizeBytes: 72,
};

const candidateExperiment: TinyAutoresearchExperimentSeed = {
  id: TINY_AUTORESEARCH_IDS.candidateExperiment,
  createdByResearchTaskId: TINY_AUTORESEARCH_IDS.experimentTask,
  createdByAgentId: TINY_AUTORESEARCH_IDS.scientistAgent,
  associatedHypothesisId: TINY_AUTORESEARCH_IDS.hypothesis,
  parentExperimentId: null,
  title: "Try component A",
  summary: "Compare component A against baseline while changing only train.py.",
  status: "done",
  worktreePath: "worktrees/component-a",
  baseCommit: "baseline-fixture",
  candidateCommit: "component-a-fixture",
};

const candidateEvaluation: TinyAutoresearchEvaluationSeed = {
  id: TINY_AUTORESEARCH_IDS.candidateEvaluation,
  createdByResearchTaskId: TINY_AUTORESEARCH_IDS.experimentTask,
  createdByAgentId: TINY_AUTORESEARCH_IDS.scientistAgent,
  title: "Component A measurement",
  summary: "Run python train.py after changing COMPONENT to component_a.",
  status: "done",
  associatedBaselineId: null,
  associatedExperimentId: TINY_AUTORESEARCH_IDS.candidateExperiment,
};

const candidateMeasurement: TinyAutoresearchMeasurementSeed = {
  id: TINY_AUTORESEARCH_IDS.candidateMeasurement,
  createdByResearchTaskId: TINY_AUTORESEARCH_IDS.experimentTask,
  createdByAgentId: TINY_AUTORESEARCH_IDS.scientistAgent,
  evaluationId: TINY_AUTORESEARCH_IDS.candidateEvaluation,
  actor: "scientist",
  body: "python train.py printed component=component_a, val_bpb=2.681, train_time_s=0.19, status=ok.",
  payload: {
    activityType: "measurement_recorded",
    measurementType: "command_output",
    command: "python train.py",
    metrics: {
      val_bpb: {
        value: 2.681,
        direction: "lower_is_better",
      },
      train_time_s: {
        value: 0.19,
        unit: "s",
        direction: "informational",
      },
    },
    rawOutputSummary: "component: component_a\nval_bpb: 2.681\ntrain_time_s: 0.19\nstatus: ok",
    comparisonBaselineId: TINY_AUTORESEARCH_IDS.baseline,
    comparisonMeasurementId: TINY_AUTORESEARCH_IDS.baselineMeasurement,
    comparisonMetricDeltas: {
      val_bpb: {
        value: -0.032,
        direction: "lower_is_better",
        notes: "Candidate minus baseline.",
      },
    },
  },
};

const candidateArtifact: TinyAutoresearchArtifactSeed = {
  id: TINY_AUTORESEARCH_IDS.candidateArtifact,
  createdByResearchTaskId: TINY_AUTORESEARCH_IDS.experimentTask,
  createdByAgentId: TINY_AUTORESEARCH_IDS.scientistAgent,
  entityKind: "evaluation",
  entityId: TINY_AUTORESEARCH_IDS.candidateEvaluation,
  kind: "stdout",
  title: "Component A command output",
  path: "artifacts/component-a-train-output.txt",
  mediaType: "text/plain",
  sizeBytes: 75,
};

const comparabilityExperiment: TinyAutoresearchExperimentSeed = {
  id: TINY_AUTORESEARCH_IDS.comparabilityExperiment,
  createdByResearchTaskId: TINY_AUTORESEARCH_IDS.experimentTask,
  createdByAgentId: TINY_AUTORESEARCH_IDS.scientistAgent,
  associatedHypothesisId: TINY_AUTORESEARCH_IDS.hypothesis,
  parentExperimentId: null,
  title: "Fake eval shortcut",
  summary: "Invalid candidate changed prepare.py and used fake_eval_shortcut.",
  status: "in_review",
  worktreePath: "worktrees/fake-eval-shortcut",
  baseCommit: "baseline-fixture",
  candidateCommit: "fake-eval-shortcut-fixture",
};

const comparabilityEvaluation: TinyAutoresearchEvaluationSeed = {
  id: TINY_AUTORESEARCH_IDS.comparabilityEvaluation,
  createdByResearchTaskId: TINY_AUTORESEARCH_IDS.experimentTask,
  createdByAgentId: TINY_AUTORESEARCH_IDS.scientistAgent,
  title: "Suspicious shortcut measurement",
  summary: "Run python train.py after modifying the evaluation surface.",
  status: "in_review",
  associatedBaselineId: null,
  associatedExperimentId: TINY_AUTORESEARCH_IDS.comparabilityExperiment,
};

const comparabilityMeasurement: TinyAutoresearchMeasurementSeed = {
  id: TINY_AUTORESEARCH_IDS.comparabilityMeasurement,
  createdByResearchTaskId: TINY_AUTORESEARCH_IDS.experimentTask,
  createdByAgentId: TINY_AUTORESEARCH_IDS.scientistAgent,
  evaluationId: TINY_AUTORESEARCH_IDS.comparabilityEvaluation,
  actor: "scientist",
  body: "python train.py printed component=fake_eval_shortcut, val_bpb=1.001, train_time_s=0.01, status=invalid.",
  payload: {
    activityType: "measurement_recorded",
    measurementType: "command_output",
    command: "python train.py",
    metrics: {
      val_bpb: {
        value: 1.001,
        direction: "lower_is_better",
        notes: "Not comparable because prepare.py changed.",
      },
      train_time_s: {
        value: 0.01,
        unit: "s",
        direction: "informational",
      },
    },
    rawOutputSummary:
      "component: fake_eval_shortcut\nval_bpb: 1.001\ntrain_time_s: 0.01\nstatus: invalid",
    comparisonBaselineId: TINY_AUTORESEARCH_IDS.baseline,
    comparisonMeasurementId: TINY_AUTORESEARCH_IDS.baselineMeasurement,
    comparisonMetricDeltas: {
      val_bpb: {
        value: -1.712,
        direction: "lower_is_better",
        notes: "Suspicious delta from an evaluation-surface change.",
      },
    },
  },
};

const comparabilityArtifact: TinyAutoresearchArtifactSeed = {
  id: TINY_AUTORESEARCH_IDS.comparabilityArtifact,
  createdByResearchTaskId: TINY_AUTORESEARCH_IDS.experimentTask,
  createdByAgentId: TINY_AUTORESEARCH_IDS.scientistAgent,
  entityKind: "experiment",
  entityId: TINY_AUTORESEARCH_IDS.comparabilityExperiment,
  kind: "diff",
  title: "Suspicious evaluation surface diff",
  path: "artifacts/fake-eval-shortcut.diff",
  mediaType: "text/x-diff",
  sizeBytes: 180,
};

const emptySeed: TinyAutoresearchSeedRecords = {
  claudeAgents: agents,
  researchProjects: [researchProject],
  researchTasks: [planTask],
  hypotheses: [],
  baselines: [],
  experiments: [],
  evaluations: [],
  measurements: [],
  artifacts: [],
  entityLinks: [],
  activities: [],
  appEvents: [
    {
      type: "session.started",
      message: "Tiny autoresearch fixture session started.",
      payload: {
        fixture: "tiny-autoresearch",
      },
    },
  ],
};

const needsBaselineSeed: TinyAutoresearchSeedRecords = {
  ...emptySeed,
  researchTasks: [planTask, { ...baselineTask, status: "planned", resultSummary: null }],
  hypotheses: [hypothesis],
};

const withBaselineSeed: TinyAutoresearchSeedRecords = {
  ...needsBaselineSeed,
  researchTasks: [planTask, baselineTask],
  baselines: [baseline],
  evaluations: [baselineEvaluation],
  measurements: [baselineMeasurement],
  artifacts: [baselineArtifact],
  activities: [
    ...needsBaselineSeed.activities,
    {
      table: "baseline_activities",
      entityId: TINY_AUTORESEARCH_IDS.baseline,
      actorAgentId: TINY_AUTORESEARCH_IDS.scientistAgent,
      actor: "scientist",
      kind: "recorded",
      body: "Baseline measurement captured before candidate changes.",
      payload: {
        activityType: "baseline_created",
      },
    },
    {
      table: "evaluation_activities",
      entityId: TINY_AUTORESEARCH_IDS.baselineEvaluation,
      actorAgentId: TINY_AUTORESEARCH_IDS.scientistAgent,
      actor: "scientist",
      kind: "completed",
      body: "Baseline command output recorded with val_bpb=2.713.",
      payload: {
        activityType: "evaluation_completed",
      },
    },
  ],
};

const withCandidateSeed: TinyAutoresearchSeedRecords = {
  ...withBaselineSeed,
  researchTasks: [planTask, baselineTask, experimentTask],
  experiments: [candidateExperiment],
  evaluations: [baselineEvaluation, candidateEvaluation],
  measurements: [baselineMeasurement, candidateMeasurement],
  artifacts: [baselineArtifact, candidateArtifact],
  entityLinks: [
    {
      id: TINY_AUTORESEARCH_IDS.candidateHypothesisLink,
      fromKind: "hypothesis",
      fromId: TINY_AUTORESEARCH_IDS.hypothesis,
      toKind: "experiment",
      toId: TINY_AUTORESEARCH_IDS.candidateExperiment,
      relationship: "tests",
    },
  ],
  activities: [
    ...withBaselineSeed.activities,
    {
      table: "experiment_activities",
      entityId: TINY_AUTORESEARCH_IDS.candidateExperiment,
      actorAgentId: TINY_AUTORESEARCH_IDS.scientistAgent,
      actor: "scientist",
      kind: "completed",
      body: "Component A changed only train.py and improved val_bpb.",
      payload: {
        activityType: "experiment_completed",
        changedFiles: ["train.py"],
      },
    },
  ],
};

const comparabilitySeed: TinyAutoresearchSeedRecords = {
  ...withBaselineSeed,
  researchTasks: [planTask, baselineTask, experimentTask, verificationTask],
  experiments: [comparabilityExperiment],
  evaluations: [baselineEvaluation, comparabilityEvaluation],
  measurements: [baselineMeasurement, comparabilityMeasurement],
  artifacts: [baselineArtifact, comparabilityArtifact],
  entityLinks: [
    {
      id: TINY_AUTORESEARCH_IDS.comparabilityHypothesisLink,
      fromKind: "hypothesis",
      fromId: TINY_AUTORESEARCH_IDS.hypothesis,
      toKind: "experiment",
      toId: TINY_AUTORESEARCH_IDS.comparabilityExperiment,
      relationship: "tests",
    },
  ],
  activities: [
    ...withBaselineSeed.activities,
    {
      table: "experiment_activities",
      entityId: TINY_AUTORESEARCH_IDS.comparabilityExperiment,
      actorAgentId: TINY_AUTORESEARCH_IDS.verifierAgent,
      actor: "verifier",
      kind: "concern",
      body: "Candidate changed prepare.py, so the apparent val_bpb improvement is not comparable.",
      payload: {
        activityType: "ResearchTaskVerification",
        researchTaskVerificationId: TINY_AUTORESEARCH_IDS.taskVerification,
        researchTaskId: TINY_AUTORESEARCH_IDS.verificationTask,
        verificationStatus: "suspicious",
        concernKind: "comparability_break",
        changedFiles: ["prepare.py", "train.py"],
        managerReaction: "prune",
      },
    },
  ],
};

const largeSearchRidgeIds = {
  researchProject: "research_project_large_search_ridge",
  planTask: "LR_TASK_PLAN",
  baselineTask: "LR_TASK_BASELINE",
  baseline: "LR_B1",
  baselineEvaluation: "LR_EV_00",
  baselineMeasurement: "LR_M_00",
  baselineArtifact: "LR_A_00",
} as const;

const largeSearchRidgeHypothesisTitles = [
  "Activation schedule warmup",
  "Dispatcher batching variant",
  "Optimizer clipping sweep",
  "Persistent cache reuse",
  "Shortcut probe",
  "Eval row freshness",
  "Token window orphan explore",
  "Version tagging ridge",
  "Filter boundary exploit",
  "Lease churn orphan explore",
  "Gradient noise ridge",
  "Decoder cache orphan explore",
  "Duplicate shortcut probe",
  "Verifier-guided ridge",
  "Prepare surface shortcut",
  "Measurement cache ridge",
  "Worker prompt orphan explore",
  "Frontier ridge",
  "Late fresh explore",
  "Unexplored control",
] as const;

const largeSearchRidgeExperimentCounts = [
  3, 3, 3, 3, 2, 3, 2, 3, 3, 2, 3, 2, 2, 3, 2, 3, 2, 3, 2, 1,
] as const;

const largeSearchRidgeCrossParentByExperimentIndex = new Map<number, number>([
  [4, 2],
  [7, 5],
  [10, 8],
  [13, 11],
  [15, 11],
  [20, 16],
  [23, 21],
  [28, 24],
  [33, 29],
  [35, 29],
  [38, 36],
  [40, 36],
  [45, 42],
]);

const largeSearchRidgePathIndexes = new Set([
  2, 4, 5, 7, 8, 10, 11, 15, 16, 20, 21, 23, 24, 28, 29, 35, 36, 40, 41, 42, 45, 46, 47,
]);
const largeSearchRidgeSuspiciousIndexes = new Set([13, 14, 33, 34, 38, 39]);
const largeSearchRidgeFailedIndexes = new Set([6, 17, 19, 26, 27, 31, 32, 44, 48, 50]);
const largeSearchRidgePrunedIndexes = new Set([14, 34, 38, 39]);

type LargeSearchRidgeBranchKind =
  | "winning_ridge"
  | "shortcut_branch"
  | "dead_branch"
  | "orphan_explore"
  | "side_branch"
  | "frontier";

type LargeSearchRidgeExperimentContext = Readonly<{
  index: number;
  hypothesisIndex: number;
  localIndex: number;
  parentIndex: number | null;
  branchKind: LargeSearchRidgeBranchKind;
  changedFiles: string[];
  valBpb: number;
}>;

function largeSearchRidgeSeedRecords(): TinyAutoresearchSeedRecords {
  const contexts = largeSearchRidgeExperimentContexts();
  const contextByIndex = new Map(contexts.map((context) => [context.index, context]));
  const researchTasks = [
    largeSearchRidgePlanTask(),
    largeSearchRidgeBaselineTask(),
    ...contexts.map((context) =>
      largeSearchRidgeTask({
        context,
        parentContext: largeSearchRidgeParentContext({ context, contextByIndex }),
      }),
    ),
  ];
  const evaluations = [
    largeSearchRidgeBaselineEvaluation(),
    ...contexts.map((context) => largeSearchRidgeEvaluation({ context })),
  ];
  const measurements = [
    largeSearchRidgeBaselineMeasurement(),
    ...contexts.map((context) =>
      largeSearchRidgeMeasurement({
        context,
        comparisonContext: largeSearchRidgeParentContext({ context, contextByIndex }),
      }),
    ),
  ];
  const artifacts = [
    largeSearchRidgeBaselineArtifact(),
    ...contexts.map((context) => largeSearchRidgeArtifact({ context })),
  ];

  return {
    claudeAgents: agents,
    researchProjects: [largeSearchRidgeProject],
    researchTasks,
    hypotheses: largeSearchRidgeHypotheses(),
    baselines: [largeSearchRidgeBaseline],
    experiments: contexts.map((context) => largeSearchRidgeExperiment({ context })),
    evaluations,
    measurements,
    artifacts,
    entityLinks: contexts.map((context) => largeSearchRidgeEntityLink({ context })),
    activities: [
      largeSearchRidgeBaselineActivity(),
      largeSearchRidgeBaselineEvaluationActivity(),
      ...contexts.map((context) => largeSearchRidgeExperimentActivity({ context })),
    ],
    appEvents: [
      {
        type: "session.started",
        message:
          "Large search ridge fixture session started with 20 hypotheses, 50 experiments, and an open LR_EX_47 frontier.",
        payload: {
          fixture: "large_search_ridge",
          topology: "flat_hypotheses_parent_experiment_tree",
          frontierExperimentId: "LR_EX_47",
        },
      },
    ],
  };
}

const largeSearchRidgeProject: TinyAutoresearchResearchProjectSeed = {
  id: largeSearchRidgeIds.researchProject,
  goal: "Improve val_bpb through a broad explore/exploit search while preserving the evaluation surface.",
  phase: "search",
  status: "blocked_on_user",
  baselineSummary:
    "large_search_ridge baseline LR_B1 uses python train.py and records val_bpb=2.713.",
  resultSummary:
    "Verified winning_ridge evidence currently ends at frontier LR_EX_47; shortcut branches that changed prepare.py were rejected.",
  createdByAgentId: TINY_AUTORESEARCH_IDS.managerAgent,
  payload: {
    fixture: "large_search_ridge",
    searchShape: "20 mostly flat hypotheses with 50 experiments linked by parent_experiment_id",
    frontierExperimentId: "LR_EX_47",
  },
};

const largeSearchRidgeBaseline: TinyAutoresearchResearchRecordSeed = {
  id: largeSearchRidgeIds.baseline,
  createdByResearchTaskId: largeSearchRidgeIds.baselineTask,
  createdByAgentId: TINY_AUTORESEARCH_IDS.scientistAgent,
  title: "Large ridge reference train.py measurement",
  summary: "large_search_ridge baseline: python train.py reports val_bpb=2.713.",
  status: "accepted",
};

function largeSearchRidgePlanTask(): TinyAutoresearchResearchTaskSeed {
  return {
    id: largeSearchRidgeIds.planTask,
    researchProjectId: largeSearchRidgeIds.researchProject,
    parentResearchTaskId: null,
    type: "explore",
    title: "Plan large_search_ridge search",
    workerPrompt:
      "Map the search as flat hypotheses with experiment-level parent_experiment_id lineage.",
    verificationPrompt:
      "Confirm the plan preserves explore/exploit behavior and keeps prepare.py out of valid comparisons.",
    status: "verified",
    priority: "high",
    createdByAgentId: TINY_AUTORESEARCH_IDS.managerAgent,
    resultSummary: "Planned large_search_ridge as 20 hypotheses and a cross-lane experiment tree.",
    targetKind: null,
    targetId: null,
    payload: {
      fixture: "large_search_ridge",
      topology: "parent_experiment_id_tree",
    },
  };
}

function largeSearchRidgeBaselineTask(): TinyAutoresearchResearchTaskSeed {
  return {
    id: largeSearchRidgeIds.baselineTask,
    researchProjectId: largeSearchRidgeIds.researchProject,
    parentResearchTaskId: largeSearchRidgeIds.planTask,
    type: "explore",
    title: "Record large_search_ridge baseline",
    workerPrompt: "Run python train.py before candidate changes and record val_bpb.",
    verificationPrompt:
      "Pass only if LR_B1, LR_EV_00, and LR_M_00 establish a comparable baseline.",
    status: "verified",
    priority: "high",
    createdByAgentId: TINY_AUTORESEARCH_IDS.scientistAgent,
    resultSummary: "Baseline output recorded val_bpb=2.713.",
    targetKind: "baseline",
    targetId: largeSearchRidgeIds.baseline,
    payload: {
      fixture: "large_search_ridge",
      command: "python train.py",
    },
  };
}

function largeSearchRidgeTask({
  context,
  parentContext,
}: {
  context: LargeSearchRidgeExperimentContext;
  parentContext: LargeSearchRidgeExperimentContext | null;
}): TinyAutoresearchResearchTaskSeed {
  const experimentId = largeSearchRidgeExperimentId({ index: context.index });
  const parentExperimentId = parentContext
    ? largeSearchRidgeExperimentId({ index: parentContext.index })
    : null;
  return {
    id: largeSearchRidgeTaskId({ index: context.index }),
    researchProjectId: largeSearchRidgeIds.researchProject,
    parentResearchTaskId: parentContext
      ? largeSearchRidgeTaskId({ index: parentContext.index })
      : largeSearchRidgeIds.baselineTask,
    type: largeSearchRidgeTaskType({ context }),
    title: largeSearchRidgeExperimentTitle({ context }),
    workerPrompt: [
      `large_search_ridge ${context.branchKind}: test ${experimentId} for ${largeSearchRidgeHypothesisId({ index: context.hypothesisIndex })}.`,
      parentExperimentId
        ? `Deepen parentExperimentId ${parentExperimentId} and preserve the parent_experiment_id lineage.`
        : "Start an orphan_explore lane without an incoming experiment fork.",
      `Allowed changedFiles evidence for this historical fixture row: ${context.changedFiles.join(", ")}.`,
    ].join(" "),
    verificationPrompt: context.changedFiles.includes("prepare.py")
      ? "Reject or mark suspicious: this branch changed prepare.py, duplicated an existing shortcut, and is not comparable."
      : "Verify val_bpb against the same baseline or verified parent and reject if prepare.py changed.",
    status: largeSearchRidgeTaskStatus({ context }),
    priority: context.branchKind === "frontier" ? "high" : "normal",
    createdByAgentId: TINY_AUTORESEARCH_IDS.managerAgent,
    resultSummary: largeSearchRidgeTaskResultSummary({ context, parentExperimentId }),
    targetKind: "experiment",
    targetId: experimentId,
    payload: {
      fixture: "large_search_ridge",
      branchKind: context.branchKind,
      hypothesisId: largeSearchRidgeHypothesisId({ index: context.hypothesisIndex }),
      parentExperimentId,
      changedFiles: context.changedFiles,
      val_bpb: context.valBpb,
      frontier: context.branchKind === "frontier",
    },
  };
}

function largeSearchRidgeHypotheses(): TinyAutoresearchResearchRecordSeed[] {
  return largeSearchRidgeHypothesisTitles.map((title, index) => {
    const hypothesisIndex = index + 1;
    return {
      id: largeSearchRidgeHypothesisId({ index: hypothesisIndex }),
      createdByResearchTaskId: largeSearchRidgeIds.planTask,
      createdByAgentId: TINY_AUTORESEARCH_IDS.managerAgent,
      title,
      summary: `${title} is a large_search_ridge test; experiment parent edges carry lineage.`,
      status: largeSearchRidgeHypothesisStatus({ index: hypothesisIndex }),
    };
  });
}

function largeSearchRidgeExperiment({
  context,
}: {
  context: LargeSearchRidgeExperimentContext;
}): TinyAutoresearchExperimentSeed {
  const experimentId = largeSearchRidgeExperimentId({ index: context.index });
  return {
    id: experimentId,
    createdByResearchTaskId: largeSearchRidgeTaskId({ index: context.index }),
    createdByAgentId: TINY_AUTORESEARCH_IDS.scientistAgent,
    associatedHypothesisId: largeSearchRidgeHypothesisId({ index: context.hypothesisIndex }),
    parentExperimentId: context.parentIndex
      ? largeSearchRidgeExperimentId({ index: context.parentIndex })
      : null,
    title: largeSearchRidgeExperimentTitle({ context }),
    summary: `${experimentId} reports val_bpb=${context.valBpb}; ${
      context.parentIndex
        ? `parent=${largeSearchRidgeExperimentId({ index: context.parentIndex })}`
        : "orphan_explore root"
    }; ${context.branchKind === "frontier" ? "open frontier" : "closed branch"}.`,
    status: largeSearchRidgeExperimentStatus({ context }),
    worktreePath: `worktrees/large-ridge/${experimentId.toLowerCase()}`,
    baseCommit: context.parentIndex
      ? `candidate-${largeSearchRidgeExperimentId({ index: context.parentIndex }).toLowerCase()}`
      : "large-ridge-baseline",
    candidateCommit: `candidate-${experimentId.toLowerCase()}`,
  };
}

function largeSearchRidgeEvaluation({
  context,
}: {
  context: LargeSearchRidgeExperimentContext;
}): TinyAutoresearchEvaluationSeed {
  const experimentId = largeSearchRidgeExperimentId({ index: context.index });
  return {
    id: largeSearchRidgeEvaluationId({ index: context.index }),
    createdByResearchTaskId: largeSearchRidgeTaskId({ index: context.index }),
    createdByAgentId: TINY_AUTORESEARCH_IDS.scientistAgent,
    title: `${experimentId} val_bpb measurement`,
    summary: context.changedFiles.includes("prepare.py")
      ? `${experimentId} is not comparable because prepare.py changed the evaluation surface.`
      : `${experimentId} ran python train.py on the unchanged evaluation surface.`,
    status: largeSearchRidgeExperimentStatus({ context }),
    associatedBaselineId: null,
    associatedExperimentId: experimentId,
  };
}

function largeSearchRidgeMeasurement({
  context,
  comparisonContext,
}: {
  context: LargeSearchRidgeExperimentContext;
  comparisonContext: LargeSearchRidgeExperimentContext | null;
}): TinyAutoresearchMeasurementSeed {
  const experimentId = largeSearchRidgeExperimentId({ index: context.index });
  const comparisonMeasurementId = comparisonContext
    ? largeSearchRidgeMeasurementId({ index: comparisonContext.index })
    : largeSearchRidgeIds.baselineMeasurement;
  const comparisonValBpb = comparisonContext?.valBpb ?? 2.713;
  return {
    id: largeSearchRidgeMeasurementId({ index: context.index }),
    createdByResearchTaskId: largeSearchRidgeTaskId({ index: context.index }),
    createdByAgentId: TINY_AUTORESEARCH_IDS.scientistAgent,
    evaluationId: largeSearchRidgeEvaluationId({ index: context.index }),
    actor: "scientist",
    body: `python train.py printed branch=${experimentId}, val_bpb=${context.valBpb}, status=${largeSearchRidgeExperimentStatus({ context })}.`,
    payload: {
      activityType: "measurement_recorded",
      measurementType: "command_output",
      command: "python train.py",
      changedFiles: context.changedFiles,
      metrics: {
        val_bpb: {
          value: context.valBpb,
          direction: "lower_is_better",
          notes: context.changedFiles.includes("prepare.py")
            ? "Not comparable because prepare.py changed."
            : "Comparable val_bpb from unchanged prepare.py evaluation surface.",
        },
        train_time_s: {
          value: Number((0.19 + (context.index % 7) * 0.01).toFixed(2)),
          unit: "s",
          direction: "informational",
        },
      },
      rawOutputSummary: `branch: ${experimentId}\nval_bpb: ${context.valBpb}\nstatus: ${largeSearchRidgeExperimentStatus({ context })}`,
      comparisonBaselineId: largeSearchRidgeIds.baseline,
      comparisonMeasurementId,
      comparisonMetricDeltas: {
        val_bpb: {
          value: Number((context.valBpb - comparisonValBpb).toFixed(3)),
          direction: "lower_is_better",
          notes: comparisonContext
            ? `Candidate minus parent ${largeSearchRidgeExperimentId({ index: comparisonContext.index })}.`
            : "Candidate minus baseline.",
        },
      },
    },
  };
}

function largeSearchRidgeArtifact({
  context,
}: {
  context: LargeSearchRidgeExperimentContext;
}): TinyAutoresearchArtifactSeed {
  const experimentId = largeSearchRidgeExperimentId({ index: context.index });
  return {
    id: largeSearchRidgeArtifactId({ index: context.index }),
    createdByResearchTaskId: largeSearchRidgeTaskId({ index: context.index }),
    createdByAgentId: TINY_AUTORESEARCH_IDS.scientistAgent,
    entityKind: context.changedFiles.includes("prepare.py") ? "experiment" : "evaluation",
    entityId: context.changedFiles.includes("prepare.py")
      ? experimentId
      : largeSearchRidgeEvaluationId({ index: context.index }),
    kind: context.changedFiles.includes("prepare.py") ? "diff" : "stdout",
    title: `${experimentId} ${context.changedFiles.includes("prepare.py") ? "suspicious diff" : "command output"}`,
    path: `artifacts/large-ridge/${experimentId.toLowerCase()}.${
      context.changedFiles.includes("prepare.py") ? "diff" : "txt"
    }`,
    mediaType: context.changedFiles.includes("prepare.py") ? "text/x-diff" : "text/plain",
    sizeBytes: context.changedFiles.includes("prepare.py") ? 210 : 88,
  };
}

function largeSearchRidgeEntityLink({
  context,
}: {
  context: LargeSearchRidgeExperimentContext;
}): TinyAutoresearchEntityLinkSeed {
  return {
    id: largeSearchRidgeEntityLinkId({ index: context.index }),
    fromKind: "hypothesis",
    fromId: largeSearchRidgeHypothesisId({ index: context.hypothesisIndex }),
    toKind: "experiment",
    toId: largeSearchRidgeExperimentId({ index: context.index }),
    relationship: context.branchKind === "frontier" ? "frontier_tests" : "tests",
  };
}

function largeSearchRidgeBaselineEvaluation(): TinyAutoresearchEvaluationSeed {
  return {
    id: largeSearchRidgeIds.baselineEvaluation,
    createdByResearchTaskId: largeSearchRidgeIds.baselineTask,
    createdByAgentId: TINY_AUTORESEARCH_IDS.scientistAgent,
    title: "Large ridge baseline measurement plan",
    summary: "Run python train.py before the large_search_ridge candidate tree.",
    status: "done",
    associatedBaselineId: largeSearchRidgeIds.baseline,
    associatedExperimentId: null,
  };
}

function largeSearchRidgeBaselineMeasurement(): TinyAutoresearchMeasurementSeed {
  return {
    id: largeSearchRidgeIds.baselineMeasurement,
    createdByResearchTaskId: largeSearchRidgeIds.baselineTask,
    createdByAgentId: TINY_AUTORESEARCH_IDS.scientistAgent,
    evaluationId: largeSearchRidgeIds.baselineEvaluation,
    actor: "scientist",
    body: "python train.py printed branch=baseline, val_bpb=2.713, status=ok.",
    payload: {
      activityType: "measurement_recorded",
      measurementType: "command_output",
      command: "python train.py",
      metrics: {
        val_bpb: {
          value: 2.713,
          direction: "lower_is_better",
          notes: "Baseline val_bpb for large_search_ridge.",
        },
      },
      rawOutputSummary: "branch: baseline\nval_bpb: 2.713\nstatus: ok",
    },
  };
}

function largeSearchRidgeBaselineArtifact(): TinyAutoresearchArtifactSeed {
  return {
    id: largeSearchRidgeIds.baselineArtifact,
    createdByResearchTaskId: largeSearchRidgeIds.baselineTask,
    createdByAgentId: TINY_AUTORESEARCH_IDS.scientistAgent,
    entityKind: "evaluation",
    entityId: largeSearchRidgeIds.baselineEvaluation,
    kind: "stdout",
    title: "Large ridge baseline output",
    path: "artifacts/large-ridge/baseline-output.txt",
    mediaType: "text/plain",
    sizeBytes: 74,
  };
}

function largeSearchRidgeBaselineActivity(): TinyAutoresearchActivitySeed {
  return {
    table: "baseline_activities",
    entityId: largeSearchRidgeIds.baseline,
    actorAgentId: TINY_AUTORESEARCH_IDS.scientistAgent,
    actor: "scientist",
    kind: "recorded",
    body: "large_search_ridge baseline LR_B1 recorded before candidate experiments.",
    payload: {
      activityType: "baseline_created",
      fixture: "large_search_ridge",
    },
  };
}

function largeSearchRidgeBaselineEvaluationActivity(): TinyAutoresearchActivitySeed {
  return {
    table: "evaluation_activities",
    entityId: largeSearchRidgeIds.baselineEvaluation,
    actorAgentId: TINY_AUTORESEARCH_IDS.scientistAgent,
    actor: "scientist",
    kind: "completed",
    body: "large_search_ridge baseline evaluation LR_EV_00 recorded val_bpb=2.713.",
    payload: {
      activityType: "evaluation_completed",
      fixture: "large_search_ridge",
    },
  };
}

function largeSearchRidgeExperimentActivity({
  context,
}: {
  context: LargeSearchRidgeExperimentContext;
}): TinyAutoresearchActivitySeed {
  return {
    table: "experiment_activities",
    entityId: largeSearchRidgeExperimentId({ index: context.index }),
    actorAgentId: context.changedFiles.includes("prepare.py")
      ? TINY_AUTORESEARCH_IDS.verifierAgent
      : TINY_AUTORESEARCH_IDS.scientistAgent,
    actor: context.changedFiles.includes("prepare.py") ? "verifier" : "scientist",
    kind: context.changedFiles.includes("prepare.py") ? "concern" : "completed",
    body: largeSearchRidgeActivityBody({ context }),
    payload: {
      activityType: context.changedFiles.includes("prepare.py")
        ? "ResearchTaskVerification"
        : "experiment_completed",
      fixture: "large_search_ridge",
      branchKind: context.branchKind,
      parentExperimentId: context.parentIndex
        ? largeSearchRidgeExperimentId({ index: context.parentIndex })
        : null,
      changedFiles: context.changedFiles,
      val_bpb: context.valBpb,
      managerReaction: context.changedFiles.includes("prepare.py") ? "prune" : "continue",
    },
  };
}

function largeSearchRidgeExperimentContexts(): LargeSearchRidgeExperimentContext[] {
  const contexts: LargeSearchRidgeExperimentContext[] = [];
  let experimentIndex = 1;
  for (
    let hypothesisIndex = 1;
    hypothesisIndex <= largeSearchRidgeExperimentCounts.length;
    hypothesisIndex += 1
  ) {
    const count = largeSearchRidgeExperimentCounts[hypothesisIndex - 1];
    for (let localIndex = 1; localIndex <= count; localIndex += 1) {
      const parentIndex =
        largeSearchRidgeCrossParentByExperimentIndex.get(experimentIndex) ??
        (localIndex > 1 ? experimentIndex - 1 : null);
      const changedFiles = largeSearchRidgeChangedFiles({ index: experimentIndex });
      const branchKind = largeSearchRidgeBranchKind({
        index: experimentIndex,
        parentIndex,
        changedFiles,
      });
      contexts.push({
        index: experimentIndex,
        hypothesisIndex,
        localIndex,
        parentIndex,
        branchKind,
        changedFiles,
        valBpb: largeSearchRidgeValBpb({ index: experimentIndex, branchKind }),
      });
      experimentIndex += 1;
    }
  }
  return contexts;
}

function largeSearchRidgeParentContext({
  context,
  contextByIndex,
}: {
  context: LargeSearchRidgeExperimentContext;
  contextByIndex: Map<number, LargeSearchRidgeExperimentContext>;
}): LargeSearchRidgeExperimentContext | null {
  if (!context.parentIndex) {
    return null;
  }
  return contextByIndex.get(context.parentIndex) ?? null;
}

function largeSearchRidgeBranchKind({
  index,
  parentIndex,
  changedFiles,
}: {
  index: number;
  parentIndex: number | null;
  changedFiles: string[];
}): LargeSearchRidgeBranchKind {
  if (index === 47) {
    return "frontier";
  }
  if (changedFiles.includes("prepare.py")) {
    return "shortcut_branch";
  }
  if (largeSearchRidgeFailedIndexes.has(index)) {
    return "dead_branch";
  }
  if (largeSearchRidgePathIndexes.has(index)) {
    return "winning_ridge";
  }
  if (!parentIndex) {
    return "orphan_explore";
  }
  return "side_branch";
}

function largeSearchRidgeChangedFiles({ index }: { index: number }): string[] {
  if (largeSearchRidgeSuspiciousIndexes.has(index)) {
    return ["prepare.py", "train.py"];
  }
  return ["train.py"];
}

function largeSearchRidgeValBpb({
  index,
  branchKind,
}: {
  index: number;
  branchKind: LargeSearchRidgeBranchKind;
}): number {
  if (branchKind === "shortcut_branch") {
    return Number((1.12 + (index % 5) * 0.007).toFixed(3));
  }
  if (branchKind === "dead_branch") {
    return Number((2.8 + (index % 6) * 0.017).toFixed(3));
  }
  const ridgeIndex = [...largeSearchRidgePathIndexes].indexOf(index);
  if (ridgeIndex >= 0 || branchKind === "frontier") {
    return Number((2.704 - (ridgeIndex + 1) * 0.008).toFixed(3));
  }
  return Number((2.69 - (index % 8) * 0.004 + (index % 3) * 0.003).toFixed(3));
}

function largeSearchRidgeHypothesisStatus({
  index,
}: {
  index: number;
}): TinyAutoresearchResearchStatus {
  if ([5, 13, 15].includes(index)) {
    return "failed";
  }
  if ([18].includes(index)) {
    return "active";
  }
  return "done";
}

function largeSearchRidgeTaskType({
  context,
}: {
  context: LargeSearchRidgeExperimentContext;
}): TinyAutoresearchResearchTaskType {
  if (context.branchKind === "orphan_explore") {
    return "explore";
  }
  if (context.branchKind === "dead_branch") {
    return "debug";
  }
  return "exploit";
}

function largeSearchRidgeTaskStatus({
  context,
}: {
  context: LargeSearchRidgeExperimentContext;
}): TinyAutoresearchResearchTaskSeed["status"] {
  if (largeSearchRidgePrunedIndexes.has(context.index)) {
    return "pruned";
  }
  if (
    context.changedFiles.includes("prepare.py") ||
    largeSearchRidgeFailedIndexes.has(context.index)
  ) {
    return "rejected";
  }
  return "verified";
}

function largeSearchRidgeExperimentStatus({
  context,
}: {
  context: LargeSearchRidgeExperimentContext;
}): TinyAutoresearchResearchStatus {
  if (largeSearchRidgePrunedIndexes.has(context.index)) {
    return "canceled";
  }
  if (context.changedFiles.includes("prepare.py")) {
    return "failed";
  }
  if (largeSearchRidgeFailedIndexes.has(context.index)) {
    return "failed";
  }
  if (context.branchKind === "frontier") {
    return "done";
  }
  return "done";
}

function largeSearchRidgeTaskResultSummary({
  context,
  parentExperimentId,
}: {
  context: LargeSearchRidgeExperimentContext;
  parentExperimentId: string | null;
}): string {
  const experimentId = largeSearchRidgeExperimentId({ index: context.index });
  if (context.branchKind === "frontier") {
    return `${experimentId} is the verified frontier and part of the plateau_window: no child has parentExperimentId ${experimentId} yet.`;
  }
  if (context.changedFiles.includes("prepare.py")) {
    return `${experimentId} was rejected as a duplicate shortcut branch; prepare.py changed and comparability failed.`;
  }
  if (context.branchKind === "dead_branch") {
    if (context.index === 44) {
      return `${experimentId} hit a debug_child runtime failure after promising parent LR_EX_43; create a debug task before abandoning the branch.`;
    }
    return `${experimentId} failed to improve val_bpb and should not be deepened.`;
  }
  if ([45, 46].includes(context.index)) {
    return `${experimentId} belongs to the plateau_window: verified progress is flattening and should trigger backtracking or widening.`;
  }
  if (!parentExperimentId) {
    return `${experimentId} is an orphan_explore branch for widening the search.`;
  }
  return `${experimentId} ${context.branchKind} compares val_bpb=${context.valBpb} against parentExperimentId ${parentExperimentId}.`;
}

function largeSearchRidgeActivityBody({
  context,
}: {
  context: LargeSearchRidgeExperimentContext;
}): string {
  const experimentId = largeSearchRidgeExperimentId({ index: context.index });
  if (context.changedFiles.includes("prepare.py")) {
    return `${experimentId} changed prepare.py and is a duplicate/comparability concern for the large_search_ridge run.`;
  }
  if (context.branchKind === "frontier") {
    return `${experimentId} is the large_search_ridge frontier: verified winning_ridge evidence with no child experiment, but the late ridge is a plateau_window.`;
  }
  if (context.index === 44) {
    return `${experimentId} records a debug_child runtime failure that should be debugged before the branch is abandoned.`;
  }
  if ([45, 46].includes(context.index)) {
    return `${experimentId} records plateau_window evidence with changedFiles=${context.changedFiles.join(",")}.`;
  }
  return `${experimentId} recorded ${context.branchKind} evidence with changedFiles=${context.changedFiles.join(",")}.`;
}

function largeSearchRidgeExperimentTitle({
  context,
}: {
  context: LargeSearchRidgeExperimentContext;
}): string {
  return `${largeSearchRidgeExperimentId({ index: context.index })} ${largeSearchRidgeHypothesisTitles[context.hypothesisIndex - 1]} ${context.localIndex}`;
}

function largeSearchRidgeHypothesisId({ index }: { index: number }): string {
  return `LR_H${pad2({ value: index })}`;
}

function largeSearchRidgeTaskId({ index }: { index: number }): string {
  return `LR_TASK_${pad2({ value: index })}`;
}

function largeSearchRidgeExperimentId({ index }: { index: number }): string {
  return `LR_EX_${pad2({ value: index })}`;
}

function largeSearchRidgeEvaluationId({ index }: { index: number }): string {
  return `LR_EV_${pad2({ value: index })}`;
}

function largeSearchRidgeMeasurementId({ index }: { index: number }): string {
  return `LR_M_${pad2({ value: index })}`;
}

function largeSearchRidgeArtifactId({ index }: { index: number }): string {
  return `LR_A_${pad2({ value: index })}`;
}

function largeSearchRidgeEntityLinkId({ index }: { index: number }): string {
  return `LR_LINK_${pad2({ value: index })}`;
}

function pad2({ value }: { value: number }): string {
  return value.toString().padStart(2, "0");
}

const seeds = {
  empty_repo: emptySeed,
  needs_baseline: needsBaselineSeed,
  with_baseline_result: withBaselineSeed,
  with_candidate_result: withCandidateSeed,
  comparability_break: comparabilitySeed,
  large_search_ridge: largeSearchRidgeSeedRecords(),
} as const satisfies Record<TinyAutoresearchSeedName, TinyAutoresearchSeedRecords>;

export function tinyAutoresearchSeed({
  name,
}: {
  name: TinyAutoresearchSeedName;
}): TinyAutoresearchSeedRecords {
  return structuredClone(seeds[name]) as TinyAutoresearchSeedRecords;
}
