import type { EventRecord, ExperimentRecord, RunRecord } from "@almanac/protocol";

export const storyWorkspace = "/Users/scott-goodfire/sandbox/support-agent";

export const runningRun = runRecord({
  overrides: {
    id: "run_0001",
    status: "running",
  },
});

export const completedRun = runRecord({
  overrides: {
    id: "run_0001",
    status: "completed",
  },
});

export const baselineExperiment = experimentRecord({
  overrides: {
    id: "exp_run_0001_baseline",
    status: "completed",
    intent: "Record baseline evidence.",
    components: ["baseline"],
    note: "Baseline evidence recorded: resolution_rate 61.0%, latency 1830ms.",
  },
});

export const runningExperiment = experimentRecord({
  overrides: {
    id: "exp_run_0001_retrieval_filter",
    status: "running",
    intent: "Try retrieval filtering on cancellation-ticket failures.",
    components: ["retrieval-filter"],
    note: "",
  },
});

export const acceptedExperiment = experimentRecord({
  overrides: {
    id: "exp_run_0001_tool_discipline",
    status: "completed",
    intent: "Tighten tool-use discipline for billing tickets.",
    components: ["tool-discipline"],
    note: "Resolution improved with latency still under guardrail.",
  },
});

export const suspiciousExperiment = experimentRecord({
  overrides: {
    id: "exp_run_0001_fixture_edit",
    status: "completed",
    intent: "Reported large improvement after eval fixture edit.",
    components: ["fixture-edit"],
    suspicious: true,
    suspicious_reason: "Touched eval fixtures, excluded from valid best result.",
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

export const runningEvents = [
  eventRecord({
    overrides: {
      id: 1,
      type: "run.started",
      message: "Started run_0001",
    },
  }),
  eventRecord({
    overrides: {
      id: 2,
      type: "experiment.completed",
      message: "Completed exp_run_0001_baseline",
    },
  }),
  eventRecord({
    overrides: {
      id: 3,
      type: "experiment.started",
      message: "Started exp_run_0001_retrieval_filter",
    },
  }),
];

export const suspiciousEvents = [
  ...runningEvents,
  eventRecord({
    overrides: {
      id: 4,
      type: "warning.created",
      message: "Marked exp_run_0001_fixture_edit suspicious because it touched eval fixtures.",
    },
  }),
];

export const completedEvents = [
  ...runningEvents,
  eventRecord({
    overrides: {
      id: 4,
      type: "run.completed",
      message: "Completed run_0001",
    },
  }),
];

function runRecord({ overrides = {} }: { overrides?: Partial<RunRecord> }): RunRecord {
  return {
    id: "run_0001",
    status: "running",
    created_at: "2026-01-01T00:00:00Z",
    updated_at: "2026-01-01T00:00:00Z",
    ...overrides,
  };
}

function experimentRecord({
  overrides = {},
}: {
  overrides?: Partial<ExperimentRecord>;
}): ExperimentRecord {
  return {
    id: "exp_run_0001_baseline",
    run_id: "run_0001",
    status: "queued",
    intent: "Record baseline evidence.",
    change_summary: "Baseline evaluation.",
    components: ["baseline"],
    based_on: [],
    suspicious: false,
    suspicious_reason: null,
    note: "",
    created_at: "2026-01-01T00:00:01Z",
    updated_at: "2026-01-01T00:00:01Z",
    ...overrides,
  };
}

function eventRecord({ overrides = {} }: { overrides?: Partial<EventRecord> }): EventRecord {
  return {
    id: 1,
    run_id: "run_0001",
    type: "run.started",
    message: "Started run_0001",
    payload: {},
    created_at: "2026-01-01T00:00:02Z",
    ...overrides,
  };
}
