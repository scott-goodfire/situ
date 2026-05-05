import type {
  EventRecord,
  ExperimentActivityRecord,
  ExperimentRecord,
  HypothesisActivityRecord,
  HypothesisRecord,
  ObjectiveRecord,
  SessionRecord,
} from "@almanac/protocol";

export const storyWorkspace = "/Users/almanac/sandbox/support-agent";
export const maxExperimentCount = 5;

export const activeObjective = objectiveRecord({});

export const runningSession = sessionRecord({
  overrides: {
    id: "session_0001",
    status: "active",
  },
});

export const completedSession = sessionRecord({
  overrides: {
    id: "session_0001",
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
    id: "objective_0001",
    title: "Improve support-agent resolution",
    description: "Improve billing and cancellation resolution without hurting latency.",
    status: "active",
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
    id: "session_0001",
    objective_id: "objective_0001",
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
    objective_id: "objective_0001",
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
    objective_id: "objective_0001",
    status: "open",
    title: "Record baseline",
    summary: "Baseline evaluation.",
    associated_session_id: "session_0001",
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
    session_id: "session_0001",
    actor: "agent",
    kind: "comment",
    body: "Retrieval filtering is a promising next direction.",
    payload: {},
    created_at: "2026-01-01T00:00:02Z",
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
    session_id: "session_0001",
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
    session_id: "session_0001",
    type: "session.started",
    message: "Started session_0001",
    payload: {},
    created_at: "2026-01-01T00:00:02Z",
    ...overrides,
  };
}
