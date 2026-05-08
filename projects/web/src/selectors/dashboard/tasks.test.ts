import { describe, expect, test } from "bun:test";
import type {
  EvaluationRecord,
  ExperimentRecord,
  TaskRecord,
} from "@situ/protocol";
import type { ProjectWorkspaceData } from "../../features/project-workspace/types";
import { dashboardTasks } from "./tasks";

describe("dashboardTasks", () => {
  test("maps task terminal statuses to the done bucket", () => {
    const rows = dashboardTasks({
      data: workspaceData({
        tasks: [
          taskRecord({ id: "T1", status: "done" }),
          taskRecord({ id: "T2", status: "canceled" }),
          taskRecord({ id: "T3", status: "failed" }),
        ],
      }),
    });

    expect(rows.map((row) => [row.id, row.status, row.tone])).toEqual([
      ["task:T2", "done", "danger"],
      ["task:T3", "done", "danger"],
      ["task:T1", "done", "success"],
    ]);
  });

  test("maps active and in-review evidence records to in progress", () => {
    const rows = dashboardTasks({
      data: workspaceData({
        tasks: [],
        experiments: [experimentRecord({ id: "EX1", status: "active" })],
        evaluations: [evaluationRecord({ id: "EV1", status: "in_review" })],
      }),
    });

    expect(rows.map((row) => [row.id, row.status])).toEqual([
      ["evaluation:EV1", "in-progress"],
      ["experiment:EX1", "in-progress"],
    ]);
  });
});

function workspaceData({
  tasks = [],
  experiments = [],
  evaluations = [],
}: {
  tasks?: TaskRecord[];
  experiments?: ExperimentRecord[];
  evaluations?: EvaluationRecord[];
}): ProjectWorkspaceData {
  return {
    workspaceId: "W1",
    projectId: "P1",
    activeProjectRecordId: "P1",
    workspace: "/tmp/project",
    connection: { kind: "connected" },
    project: undefined,
    sessions: [],
    hypotheses: [],
    experiments,
    evaluations,
    analyses: [],
    agents: [],
    tasks,
    taskDependencies: [],
    taskEntityLinks: [],
    taskActivities: [],
    analysisActivities: [],
    hypothesisExperimentLinks: [],
    hypothesisActivities: [],
    experimentActivities: [],
    evaluationActivities: [],
    artifacts: [],
    events: [],
  } as ProjectWorkspaceData;
}

function taskRecord({
  id,
  status,
}: {
  id: string;
  status: TaskRecord["status"];
}): TaskRecord {
  return {
    id,
    project_id: "P1",
    created_in_session_id: "S1",
    title: `Task ${id}`,
    content: "Do the focused task.",
    kind: "experiment",
    status,
    priority: "normal",
    source_kind: "manager",
    assignee_id: null,
    parent_task_id: null,
    payload: {},
    pydantic_run_id: null,
    conversation_id: null,
    result_summary: null,
    workflow_id: null,
    created_at: "2026-01-01T00:00:00Z",
    available_at: "2026-01-01T00:00:00Z",
    claimed_in_session_id: null,
    claimed_at: null,
    completed_in_session_id: null,
    completed_at: null,
    updated_at: "2026-01-01T00:00:00Z",
  };
}

function experimentRecord({
  id,
  status,
}: {
  id: string;
  status: ExperimentRecord["status"];
}): ExperimentRecord {
  return {
    id,
    project_id: "P1",
    created_in_session_id: "S1",
    status,
    title: `Experiment ${id}`,
    summary: "Candidate experiment.",
    worktree_path: null,
    base_commit: null,
    candidate_commit: null,
    parent_experiment_id: null,
    research_thread: null,
    created_at: "2026-01-01T00:00:00Z",
    updated_at: "2026-01-01T00:00:00Z",
  };
}

function evaluationRecord({
  id,
  status,
}: {
  id: string;
  status: EvaluationRecord["status"];
}): EvaluationRecord {
  return {
    id,
    project_id: "P1",
    created_in_session_id: "S1",
    status,
    title: `Evaluation ${id}`,
    summary: "Measurement thread.",
    associated_baseline_id: null,
    associated_experiment_id: "EX1",
    created_at: "2026-01-01T00:00:00Z",
    updated_at: "2026-01-01T00:00:00Z",
  };
}
