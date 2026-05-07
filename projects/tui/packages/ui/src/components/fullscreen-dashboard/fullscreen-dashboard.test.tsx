import { expect, test } from "bun:test";
import type { ExperimentRecord, TaskRecord } from "@situ/protocol";
import { renderInk } from "../../testing/ink-render.js";
import {
  FullscreenDashboard,
  readableDashboardTaskTitle,
  readableExperimentDashboardTitle,
  taskLabelFromId,
  wrapTaskTitleForDashboard,
  type DashboardTask,
} from "./fullscreen-dashboard.js";

test("task title wrapping uses one space after the status glyph", async () => {
  const instance = renderInk(
    <FullscreenDashboard
      workspace="/tmp/support-agent"
      statusLine="active session"
      dashboardMessage={undefined}
      project={undefined}
      session={undefined}
      tasks={[
        taskRecord({
          title: "Dev-only miss instrumentation and smallest safe spelling fix",
          kind: "research",
          status: "done",
        }),
      ]}
      experimentCount={0}
      maxExperiments={6}
      hypotheses={[]}
      experiments={[]}
      evaluations={[]}
      taskActivities={[]}
      hypothesisActivities={[]}
      experimentActivities={[]}
      evaluationActivities={[]}
      events={[]}
      onDashboardCommand={() => {}}
      terminalSize={{ columns: 110, rows: 28 }}
    />,
  );

  try {
    await waitForFrame();

    const frame = instance.lastFrame() ?? "";
    expect(frame).toContain("● [T1] Research Dev-only");
    expect(frame).not.toContain("●  [T1] Research Dev-only");
    expect(frame).toContain("instrumentation and smalles…");
  } finally {
    instance.unmount();
  }
});

test("dashboard frame reserves the last terminal column", async () => {
  const instance = renderInk(
    <FullscreenDashboard
      workspace="/tmp/support-agent"
      statusLine="active session"
      dashboardMessage={undefined}
      project={undefined}
      session={undefined}
      tasks={[]}
      experimentCount={0}
      maxExperiments={6}
      hypotheses={[]}
      experiments={[]}
      evaluations={[]}
      taskActivities={[]}
      hypothesisActivities={[]}
      experimentActivities={[]}
      evaluationActivities={[]}
      events={[]}
      onDashboardCommand={() => {}}
      terminalSize={{ columns: 100, rows: 28 }}
    />,
  );

  try {
    await waitForFrame();

    const frame = instance.lastFrame() ?? "";
    const topBorder = frame.split("\n").find((line) => line.startsWith("┌"));
    expect(topBorder?.length).toBe(99);
    expect(topBorder?.endsWith("┐")).toBe(true);
  } finally {
    instance.unmount();
  }
});

test("wrapTaskTitleForDashboard wraps before truncating", () => {
  expect(
    wrapTaskTitleForDashboard({
      title: "Test cheap edit-aware scoring if vocabulary errors cluster",
      width: 24,
      maxLines: 2,
    }),
  ).toEqual(["Test cheap edit-aware", "scoring if vocabulary…"]);
});

test("readableDashboardTaskTitle prefixes non-action task titles by task kind", () => {
  const task: DashboardTask = {
    id: "task:001",
    title: "Dev-only miss instrumentation",
    status: "in-progress",
    kind: "task",
    taskKind: "research",
  };

  expect(readableDashboardTaskTitle({ task })).toBe(
    "Research Dev-only miss instrumentation",
  );
});

test("readableExperimentDashboardTitle includes compact lineage context", () => {
  expect(
    readableExperimentDashboardTitle({
      experiment: experimentRecord({
        title: "Try component A",
        parentExperimentId: "EX1",
        researchThread: "component_a",
        candidateCommit: "abcdef123456",
      }),
    }),
  ).toBe("Try component A [thread component_a | parent EX1 | cand abcdef1]");
});

test("taskLabelFromId only accepts canonical task ids", () => {
  expect(taskLabelFromId({ id: "T7" })).toBe("[T7]");
  expect(taskLabelFromId({ id: "task-0007" })).toBeUndefined();
});

function taskRecord({
  title,
  kind,
  status,
}: {
  title: string;
  kind: TaskRecord["kind"];
  status: TaskRecord["status"];
}): TaskRecord {
  return {
    id: "T1",
    project_id: "P1",
    created_in_session_id: "S1",
    title,
    content: "Do the focused task and mark it done.",
    kind,
    status,
    priority: "normal",
    source_kind: "manager",
    assignee_id: undefined,
    parent_task_id: undefined,
    payload: {},
    pydantic_run_id: undefined,
    conversation_id: undefined,
    result_summary: undefined,
    created_at: "2026-01-01T00:00:00Z",
    available_at: "2026-01-01T00:00:00Z",
    claimed_in_session_id: undefined,
    claimed_at: undefined,
    completed_in_session_id: undefined,
    completed_at: undefined,
    updated_at: "2026-01-01T00:00:00Z",
  };
}

function experimentRecord({
  title,
  parentExperimentId,
  researchThread,
  candidateCommit,
}: {
  title: string;
  parentExperimentId: string | undefined;
  researchThread: string | undefined;
  candidateCommit: string | undefined;
}): ExperimentRecord {
  return {
    id: "EX2",
    project_id: "P1",
    created_in_session_id: "S1",
    title,
    summary: "Candidate experiment.",
    status: "closed",
    worktree_path: undefined,
    base_commit: "base1234",
    candidate_commit: candidateCommit,
    parent_experiment_id: parentExperimentId,
    research_thread: researchThread,
    created_at: "2026-01-01T00:00:00Z",
    updated_at: "2026-01-01T00:00:00Z",
  };
}

async function waitForFrame() {
  await new Promise((resolveFrame) => {
    setTimeout(resolveFrame, 20);
  });
}
