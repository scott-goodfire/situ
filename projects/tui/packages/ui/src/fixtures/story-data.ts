import type {
  AgentRecord,
  EventRecord,
  EvaluationActivityRecord,
  EvaluationRecord,
  ExperimentActivityRecord,
  ExperimentRecord,
  HypothesisActivityRecord,
  HypothesisRecord,
  ProjectRecord,
  SessionRecord,
  TaskActivityRecord,
  TaskEntityLinkRecord,
  TaskRecord,
} from "@situ/protocol";

export const storyWorkspace = "/Users/situ/sandbox/support-agent";
export const maxExperimentCount = 5;

const storyWorkspaceId = "workspace_0001";
const storyProjectId = "P1";
const storySessionId = "S1";

export const activeProject = projectRecord({});

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

const managerAgent = agentRecord({
  overrides: {
    id: "agent_manager_0001",
    kind: "manager",
    display_name: "Manager",
    status: "active",
  },
});

const scientistAgent = agentRecord({
  overrides: {
    id: "agent_scientist_0001",
    kind: "scientist",
    display_name: "Scientist",
    status: "active",
  },
});

export const activeHypothesis = hypothesisRecord({});

const baselineExperiment = experimentRecord({
  overrides: {
    id: "EX1",
    status: "closed",
    title: "Record baseline",
    summary: "Baseline result recorded: score 0.61, latency 1830ms.",
  },
});

export const runningExperiment = experimentRecord({
  overrides: {
    id: "EX2",
    status: "active",
    title: "Try retrieval filtering",
    summary: "Try retrieval filtering on cancellation-ticket failures.",
  },
});

export const acceptedExperiment = experimentRecord({
  overrides: {
    id: "EX3",
    status: "closed",
    title: "Tighten tool-use discipline",
    summary: "Tighten tool-use discipline for billing tickets.",
  },
});

export const suspiciousExperiment = experimentRecord({
  overrides: {
    id: "EX4",
    status: "closed",
    title: "Reported large improvement",
    summary: "Reported large improvement after eval fixture edit.",
  },
});

const baselineEvaluation = evaluationRecord({
  overrides: {
    id: "EV1",
    status: "closed",
    title: "Baseline project eval",
    summary: "Baseline result recorded before candidate changes.",
  },
});

const runningEvaluation = evaluationRecord({
  overrides: {
    id: "EV2",
    status: "active",
    title: "Evaluate retrieval filtering",
    summary: "Run the normal support-agent eval after retrieval filtering.",
    associated_experiment_id: runningExperiment.id,
  },
});

const suspiciousEvaluation = evaluationRecord({
  overrides: {
    id: "EV3",
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

export const runningTasks = [
  taskRecord({
    overrides: {
      id: "T1",
      title: "Record baseline eval",
      kind: "baseline",
      status: "done",
      assignee_id: scientistAgent.id,
      completed_at: "2026-01-01T00:00:03Z",
      completed_in_session_id: storySessionId,
      result_summary: "Score 0.61, latency 1830ms.",
    },
  }),
  taskRecord({
    overrides: {
      id: "T2",
      title: "Test retrieval filter",
      kind: "experiment",
      status: "in_progress",
      priority: "high",
      assignee_id: scientistAgent.id,
      claimed_at: "2026-01-01T00:00:04Z",
      claimed_in_session_id: storySessionId,
    },
  }),
  taskRecord({
    overrides: {
      id: "T3",
      title: "Split cancellation hypothesis",
      kind: "hypothesize",
      status: "backlog",
      assignee_id: managerAgent.id,
    },
  }),
  taskRecord({
    overrides: {
      id: "T4",
      title: "Check hallucination-rate signal",
      kind: "review",
      status: "backlog",
      priority: "high",
      assignee_id: managerAgent.id,
    },
  }),
];

export const suspiciousTasks = [
  ...runningTasks,
  taskRecord({
    overrides: {
      id: "T5",
      title: "Review eval fixture edit",
      kind: "review",
      status: "failed",
      priority: "urgent",
      assignee_id: managerAgent.id,
      result_summary: "Fixture changed while reporting a large improvement.",
      completed_at: "2026-01-01T00:00:07Z",
      completed_in_session_id: storySessionId,
    },
  }),
];

export const completedTasks = runningTasks.map((task) => ({
  ...task,
  status: "done" as const,
  completed_at: task.completed_at ?? "2026-01-01T00:00:06Z",
  completed_in_session_id: task.completed_in_session_id ?? storySessionId,
}));

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
      payload: {
        activity_type: "result",
        signals: [{ key: "score", value: 0.61 }],
      },
    },
  }),
  experimentActivityRecord({
    overrides: {
      id: 2,
      experiment_id: acceptedExperiment.id,
      kind: "comment",
      body: "Tool discipline result recorded: score 0.66, latency 1770ms.",
      payload: {
        activity_type: "result",
        signals: [{ key: "score", value: 0.66 }],
      },
      created_at: "2026-01-01T00:00:04Z",
    },
  }),
  experimentActivityRecord({
    overrides: {
      id: 3,
      experiment_id: runningExperiment.id,
      kind: "comment",
      body: "Testing retrieval filtering.",
      created_at: "2026-01-01T00:00:05Z",
    },
  }),
];

export const runningEvaluationActivities = [
  evaluationActivityRecord({
    overrides: {
      id: 1,
      evaluation_id: baselineEvaluation.id,
      body: "Baseline eval result: score 0.61, latency 1830ms.",
      payload: {
        activity_type: "result",
        signals: [{ key: "score", value: 0.61 }],
      },
      created_at: "2026-01-01T00:00:03Z",
    },
  }),
  evaluationActivityRecord({
    overrides: {
      id: 2,
      evaluation_id: runningEvaluation.id,
      body: "Running normal eval after retrieval filtering.",
      payload: { activity_type: "result" },
      created_at: "2026-01-01T00:00:06Z",
    },
  }),
];

export const runningTaskActivities = [
  taskActivityRecord({
    overrides: {
      id: 1,
      task_id: "T1",
      actor_agent_id: scientistAgent.id,
      actor: "scientist",
      body: "Baseline task completed with score 0.61.",
      created_at: "2026-01-01T00:00:03Z",
    },
  }),
  taskActivityRecord({
    overrides: {
      id: 2,
      task_id: "T2",
      actor_agent_id: scientistAgent.id,
      actor: "scientist",
      body: "Retrieval filter is running against cancellation failures.",
      created_at: "2026-01-01T00:00:06Z",
    },
  }),
];

export const runningTaskEntityLinks = [
  taskEntityLinkRecord({
    overrides: {
      task_id: "T1",
      entity_kind: "experiment",
      entity_id: baselineExperiment.id,
      relationship: "produces",
      created_at: "2026-01-01T00:00:03Z",
    },
  }),
  taskEntityLinkRecord({
    overrides: {
      task_id: "T1",
      entity_kind: "evaluation",
      entity_id: baselineEvaluation.id,
      relationship: "reviews",
      created_at: "2026-01-01T00:00:03Z",
    },
  }),
  taskEntityLinkRecord({
    overrides: {
      task_id: "T2",
      entity_kind: "experiment",
      entity_id: runningExperiment.id,
      relationship: "produces",
      created_at: "2026-01-01T00:00:05Z",
    },
  }),
  taskEntityLinkRecord({
    overrides: {
      task_id: "T2",
      entity_kind: "evaluation",
      entity_id: runningEvaluation.id,
      relationship: "reviews",
      created_at: "2026-01-01T00:00:06Z",
    },
  }),
];

export const suspiciousExperimentActivities = [
  ...runningExperimentActivities,
  experimentActivityRecord({
    overrides: {
      id: 4,
      experiment_id: suspiciousExperiment.id,
      kind: "comment",
      body: "Result shape changed unexpectedly after eval fixture edit.",
      payload: { activity_type: "concern" },
      created_at: "2026-01-01T00:00:07Z",
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
      created_at: "2026-01-01T00:00:08Z",
    },
  }),
];

export const suspiciousTaskActivities = [
  ...runningTaskActivities,
  taskActivityRecord({
    overrides: {
      id: 3,
      task_id: "T5",
      actor_agent_id: managerAgent.id,
      actor: "manager",
      body: "Review failed because the trust check found fixture drift.",
      payload: { activity_type: "concern" },
      created_at: "2026-01-01T00:00:08Z",
    },
  }),
];

export const completedTaskActivities = [
  ...runningTaskActivities,
  taskActivityRecord({
    overrides: {
      id: 4,
      task_id: "T4",
      actor_agent_id: managerAgent.id,
      actor: "manager",
      body: "Closed review after validating result signals.",
      created_at: "2026-01-01T00:00:09Z",
    },
  }),
];

export const runningEvents = [
  eventRecord({
    overrides: {
      id: 1,
      type: "session.started",
      message: "Started S1",
    },
  }),
  eventRecord({
    overrides: {
      id: 2,
      type: "experiment.completed",
      message: "Completed EX1",
      created_at: "2026-01-01T00:00:03Z",
    },
  }),
  eventRecord({
    overrides: {
      id: 3,
      type: "experiment.started",
      message: "Started EX2",
      created_at: "2026-01-01T00:00:05Z",
    },
  }),
];

export const suspiciousEvents = [
  ...runningEvents,
  eventRecord({
    overrides: {
      id: 4,
      type: "experiment.activity_recorded",
      message: "Concern recorded for EX4.",
      created_at: "2026-01-01T00:00:08Z",
    },
  }),
];

export const completedEvents = [
  ...runningEvents,
  eventRecord({
    overrides: {
      id: 4,
      type: "session.completed",
      message: "Completed S1",
      created_at: "2026-01-01T00:00:09Z",
    },
  }),
];

function projectRecord({
  overrides = {},
}: {
  overrides?: Partial<ProjectRecord>;
}): ProjectRecord {
  return {
    id: storyProjectId,
    workspace_id: storyWorkspaceId,
    title: "Improve support-agent resolution",
    objective: "Improve support-agent resolution without hurting latency.",
    research_context: "Run project-native evals and collect plaintext evidence.",
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
    id: storySessionId,
    workspace_id: storyWorkspaceId,
    project_id: storyProjectId,
    status: "active",
    created_at: "2026-01-01T00:00:00Z",
    updated_at: "2026-01-01T00:00:00Z",
    ...overrides,
  };
}

function agentRecord({
  overrides = {},
}: {
  overrides?: Partial<AgentRecord>;
}): AgentRecord {
  return {
    id: "agent_manager_0001",
    project_id: storyProjectId,
    created_in_session_id: storySessionId,
    kind: "manager",
    display_name: "Manager",
    model_name: "claude-opus",
    status: "active",
    created_at: "2026-01-01T00:00:00Z",
    updated_at: "2026-01-01T00:00:00Z",
    ...overrides,
  };
}

function taskRecord({
  overrides = {},
}: {
  overrides?: Partial<TaskRecord>;
}): TaskRecord {
  return {
    id: "T1",
    project_id: storyProjectId,
    created_in_session_id: storySessionId,
    title: "Record baseline eval",
    content: "Run baseline eval and record the result signals.",
    kind: "baseline",
    status: "backlog",
    priority: "normal",
    source_kind: "manager",
    assignee_id: scientistAgent.id,
    parent_task_id: undefined,
    payload: {},
    pydantic_run_id: undefined,
    conversation_id: undefined,
    result_summary: undefined,
    created_at: "2026-01-01T00:00:01Z",
    available_at: "2026-01-01T00:00:01Z",
    claimed_in_session_id: undefined,
    claimed_at: undefined,
    completed_in_session_id: undefined,
    completed_at: undefined,
    updated_at: "2026-01-01T00:00:01Z",
    ...overrides,
  };
}

function hypothesisRecord({
  overrides = {},
}: {
  overrides?: Partial<HypothesisRecord>;
}): HypothesisRecord {
  return {
    id: "H1",
    project_id: storyProjectId,
    created_in_session_id: storySessionId,
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
    id: "EX1",
    project_id: storyProjectId,
    created_in_session_id: storySessionId,
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
    id: "EV1",
    project_id: storyProjectId,
    created_in_session_id: storySessionId,
    status: "open",
    title: "Baseline project eval",
    summary: "Baseline evaluation.",
    associated_experiment_id: undefined,
    created_at: "2026-01-01T00:00:01Z",
    updated_at: "2026-01-01T00:00:01Z",
    ...overrides,
  };
}

function taskActivityRecord({
  overrides = {},
}: {
  overrides?: Partial<TaskActivityRecord>;
}): TaskActivityRecord {
  return {
    id: 1,
    project_id: storyProjectId,
    task_id: "T1",
    created_in_session_id: storySessionId,
    actor_agent_id: scientistAgent.id,
    actor: "scientist",
    kind: "comment",
    body: "Task activity recorded.",
    payload: {},
    created_at: "2026-01-01T00:00:02Z",
    ...overrides,
  };
}

function taskEntityLinkRecord({
  overrides = {},
}: {
  overrides?: Partial<TaskEntityLinkRecord>;
}): TaskEntityLinkRecord {
  return {
    project_id: storyProjectId,
    task_id: "T1",
    entity_kind: "evaluation",
    entity_id: "EV1",
    relationship: "created",
    created_at: "2026-01-01T00:00:03Z",
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
    hypothesis_id: "H1",
    created_in_session_id: storySessionId,
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
    evaluation_id: "EV1",
    created_in_session_id: storySessionId,
    actor: "agent",
    kind: "result",
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
    experiment_id: "EX1",
    created_in_session_id: storySessionId,
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
    associated_project_id: storyProjectId,
    associated_session_id: storySessionId,
    type: "session.started",
    message: "Started S1",
    payload: {},
    created_at: "2026-01-01T00:00:02Z",
    ...overrides,
  };
}
