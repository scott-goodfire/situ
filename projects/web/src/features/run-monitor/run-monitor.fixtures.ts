import type {
  EventRecord,
  ExperimentActivityRecord,
  ExperimentRecord,
  HypothesisRecord,
  ObjectiveRecord,
  ResearchContextRecord,
  SessionRecord,
} from "@situ/protocol";

export const storyWorkspace = "/Users/situ/sandbox/support-agent";
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
    summary: "Baseline result recorded: resolution_rate 61.0%, latency 1830ms.",
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
    summary: "Resolution improved with latency still under guardrail.",
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

export const runningExperimentActivities = [
  experimentActivityRecord({
    overrides: {
      id: 1,
      experiment_id: baselineExperiment.id,
      kind: "comment",
      body: "Baseline result recorded: resolution_rate 61.0%, latency 1830ms.",
      payload: { activity_type: "result" },
    },
  }),
  experimentActivityRecord({
    overrides: {
      id: 2,
      experiment_id: acceptedExperiment.id,
      kind: "comment",
      body: "Resolution improved with latency still under guardrail.",
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
      body: "Result shape changed unexpectedly.",
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
      message: "Recorded a concern for exp_session_0001_fixture_edit.",
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
