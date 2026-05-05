import type {
  EventRecord,
  EvaluationActivityRecord,
  EvaluationRecord,
  ExperimentActivityRecord,
  ExperimentRecord,
  HypothesisActivityRecord,
  HypothesisRecord,
  ObjectiveRecord,
  ResearchContextRecord,
  SessionRecord,
} from "@almanac/protocol";

export const storyWorkspace = "/Users/almanac/sandbox/support-agent";
export const maxExperimentCount = 5;
export const storyProjectId = "project_0001";
export const storySessionId = "session_0001";

export const activeObjective = objectiveRecord({});

export const activeResearchContext = researchContextRecord({});

export const runningSession = sessionRecord({
  overrides: {
    id: storySessionId,
    status: "active",
  },
});

export const completedSession = sessionRecord({
  overrides: {
    id: storySessionId,
    status: "closed",
  },
});

export const activeHypothesis = hypothesisRecord({});

export const baselineExperiment = experimentRecord({
  overrides: {
    id: "exp_session_0001_baseline",
    status: "closed",
    title: "Record baseline",
    summary: "Baseline result recorded: score 0.61, latency 1830ms.",
  },
});

export const runningExperiment = experimentRecord({
  overrides: {
    id: "exp_session_0001_retrieval_filter",
    status: "active",
    title: "Try retrieval filtering",
    summary: "Try retrieval filtering on cancellation-ticket failures.",
  },
});

export const acceptedExperiment = experimentRecord({
  overrides: {
    id: "exp_session_0001_tool_discipline",
    status: "closed",
    title: "Tighten tool-use discipline",
    summary: "Tighten tool-use discipline for billing tickets.",
  },
});

export const suspiciousExperiment = experimentRecord({
  overrides: {
    id: "exp_session_0001_fixture_edit",
    status: "closed",
    title: "Reported large improvement",
    summary: "Reported large improvement after eval fixture edit.",
  },
});

export const baselineEvaluation = evaluationRecord({
  overrides: {
    id: "eval_session_0001_baseline",
    status: "closed",
    title: "Baseline project eval",
    summary: "Baseline result recorded before candidate changes.",
  },
});

export const runningEvaluation = evaluationRecord({
  overrides: {
    id: "eval_session_0001_retrieval_filter",
    status: "active",
    title: "Evaluate retrieval filtering",
    summary: "Run the normal support-agent eval after retrieval filtering.",
    associated_experiment_id: runningExperiment.id,
  },
});

export const suspiciousEvaluation = evaluationRecord({
  overrides: {
    id: "eval_session_0001_fixture_edit",
    status: "closed",
    title: "Evaluate reported large improvement",
    summary: "Candidate output is suspicious because eval fixtures changed.",
    associated_experiment_id: suspiciousExperiment.id,
  },
});

export const runningExperiments = [
  baselineExperiment,
  acceptedExperiment,
  runningExperiment,
];

export const suspiciousExperiments = [
  baselineExperiment,
  acceptedExperiment,
  suspiciousExperiment,
];

export const completedExperiments = [
  baselineExperiment,
  acceptedExperiment,
];

export const runningEvaluations = [
  baselineEvaluation,
  runningEvaluation,
];

export const suspiciousEvaluations = [
  baselineEvaluation,
  suspiciousEvaluation,
];

export const completedEvaluations = [
  baselineEvaluation,
];

export const runningHypothesisActivities = [
  hypothesisActivityRecord({
    overrides: {
      id: 1,
      body: "Retrieval filtering looks worth exploring next.",
    },
  }),
];

export const runningExperimentActivities = [
  experimentActivityRecord({
    overrides: {
      id: 1,
      experiment_id: baselineExperiment.id,
      kind: "comment",
      body: "Baseline result recorded: score 0.61, latency 1830ms.",
      payload: { activity_type: "result" },
    },
  }),
  experimentActivityRecord({
    overrides: {
      id: 2,
      experiment_id: runningExperiment.id,
      kind: "comment",
      body: "Testing retrieval filtering.",
    },
  }),
];

export const runningEvaluationActivities = [
  evaluationActivityRecord({
    overrides: {
      id: 1,
      evaluation_id: baselineEvaluation.id,
      body: "Baseline eval result: score 0.61, latency 1830ms.",
      payload: { activity_type: "result" },
    },
  }),
  evaluationActivityRecord({
    overrides: {
      id: 2,
      evaluation_id: runningEvaluation.id,
      body: "Running normal eval after retrieval filtering.",
      payload: { activity_type: "result" },
    },
  }),
];

export const suspiciousExperimentActivities = [
  ...runningExperimentActivities,
  experimentActivityRecord({
    overrides: {
      id: 3,
      experiment_id: suspiciousExperiment.id,
      kind: "comment",
      body: "exp_session_0001_fixture_edit: Result shape changed unexpectedly.",
      payload: { activity_type: "concern" },
    },
  }),
];

export const suspiciousEvaluationActivities = [
  runningEvaluationActivities[0],
  evaluationActivityRecord({
    overrides: {
      id: 3,
      evaluation_id: suspiciousEvaluation.id,
      body: "Result shape changed unexpectedly after eval fixture edit.",
      payload: { activity_type: "concern" },
    },
  }),
];

export const runningEvents = [
  eventRecord({
    overrides: {
      id: 1,
      type: "session.started",
      message: "Started session_0001",
    },
  }),
  eventRecord({
    overrides: {
      id: 2,
      type: "experiment.completed",
      message: "Completed exp_session_0001_baseline",
    },
  }),
  eventRecord({
    overrides: {
      id: 3,
      type: "experiment.started",
      message: "Started exp_session_0001_retrieval_filter",
    },
  }),
];

export const suspiciousEvents = [
  ...runningEvents,
  eventRecord({
    overrides: {
      id: 4,
      type: "experiment.activity_recorded",
      message: "Concern recorded for exp_session_0001_fixture_edit.",
    },
  }),
];

export const completedEvents = [
  ...runningEvents,
  eventRecord({
    overrides: {
      id: 4,
      type: "session.completed",
      message: "Completed session_0001",
    },
  }),
];

function objectiveRecord({
  overrides = {},
}: {
  overrides?: Partial<ObjectiveRecord>;
}): ObjectiveRecord {
  return {
    id: `obj_${storySessionId}`,
    session_id: storySessionId,
    title: "Improve support-agent resolution",
    description: "Improve billing and cancellation resolution without hurting latency.",
    status: "active",
    created_at: "2026-01-01T00:00:00Z",
    updated_at: "2026-01-01T00:00:00Z",
    ...overrides,
  };
}

function researchContextRecord({
  overrides = {},
}: {
  overrides?: Partial<ResearchContextRecord>;
}): ResearchContextRecord {
  return {
    id: `rctx_${storySessionId}`,
    session_id: storySessionId,
    body: "Run project-native evals and collect plaintext evidence.",
    created_at: "2026-01-01T00:00:00Z",
    updated_at: "2026-01-01T00:00:00Z",
    ...overrides,
  };
}

function sessionRecord({
  overrides = {},
}: {
  overrides?: Partial<SessionRecord>;
}): SessionRecord {
  return {
    id: storySessionId,
    project_id: storyProjectId,
    status: "active",
    created_at: "2026-01-01T00:00:00Z",
    updated_at: "2026-01-01T00:00:00Z",
    ...overrides,
  };
}

function hypothesisRecord({
  overrides = {},
}: {
  overrides?: Partial<HypothesisRecord>;
}): HypothesisRecord {
  return {
    id: "hyp_0001",
    session_id: storySessionId,
    title: "Retrieval filtering can improve cancellation tickets",
    summary: "Filter low-confidence retrieval snippets before tool calls.",
    status: "active",
    created_at: "2026-01-01T00:00:01Z",
    updated_at: "2026-01-01T00:00:01Z",
    ...overrides,
  };
}

function experimentRecord({
  overrides = {},
}: {
  overrides?: Partial<ExperimentRecord>;
}): ExperimentRecord {
  return {
    id: "exp_session_0001_baseline",
    session_id: storySessionId,
    status: "open",
    title: "Record baseline",
    summary: "Baseline evaluation.",
    created_at: "2026-01-01T00:00:01Z",
    updated_at: "2026-01-01T00:00:01Z",
    ...overrides,
  };
}

function evaluationRecord({
  overrides = {},
}: {
  overrides?: Partial<EvaluationRecord>;
}): EvaluationRecord {
  return {
    id: "eval_session_0001_baseline",
    session_id: storySessionId,
    status: "open",
    title: "Baseline project eval",
    summary: "Baseline evaluation.",
    associated_experiment_id: undefined,
    created_at: "2026-01-01T00:00:01Z",
    updated_at: "2026-01-01T00:00:01Z",
    ...overrides,
  };
}

function hypothesisActivityRecord({
  overrides = {},
}: {
  overrides?: Partial<HypothesisActivityRecord>;
}): HypothesisActivityRecord {
  return {
    id: 1,
    hypothesis_id: "hyp_0001",
    actor: "agent",
    kind: "comment",
    body: "Retrieval filtering is a promising next direction.",
    payload: {},
    created_at: "2026-01-01T00:00:02Z",
    ...overrides,
  };
}

function evaluationActivityRecord({
  overrides = {},
}: {
  overrides?: Partial<EvaluationActivityRecord>;
}): EvaluationActivityRecord {
  return {
    id: 1,
    evaluation_id: "eval_session_0001_baseline",
    actor: "agent",
    kind: "comment",
    body: "Baseline eval result recorded.",
    payload: { activity_type: "result" },
    created_at: "2026-01-01T00:00:03Z",
    ...overrides,
  };
}

function experimentActivityRecord({
  overrides = {},
}: {
  overrides?: Partial<ExperimentActivityRecord>;
}): ExperimentActivityRecord {
  return {
    id: 1,
    experiment_id: "exp_session_0001_baseline",
    actor: "worker",
    kind: "comment",
    body: "Baseline result recorded.",
    payload: { activity_type: "result" },
    created_at: "2026-01-01T00:00:03Z",
    ...overrides,
  };
}

function eventRecord({ overrides = {} }: { overrides?: Partial<EventRecord> }): EventRecord {
  return {
    id: 1,
    session_id: storySessionId,
    type: "session.started",
    message: "Started session_0001",
    payload: {},
    created_at: "2026-01-01T00:00:02Z",
    ...overrides,
  };
}
