import { expect, test } from "bun:test";
import type {
  ExperimentRecord,
  TaskEntityLinkRecord,
  TaskRecord,
} from "@situ/protocol";
import { renderInk } from "../../testing/ink-render.js";
import {
  FullscreenDashboard,
  readableDashboardTaskTitle,
  readableExperimentDashboardTitle,
  taskLabelFromId,
  taskOutputLineForDashboard,
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

test("task output links render as a flat row", async () => {
  const instance = renderInk(
    <FullscreenDashboard
      workspace="/tmp/support-agent"
      statusLine="active session"
      dashboardMessage={undefined}
      project={undefined}
      session={undefined}
      tasks={[
        taskRecord({
          id: "T8",
          title: "Test edit-aware scoring",
          kind: "experiment",
          status: "in_progress",
        }),
      ]}
      experimentCount={0}
      maxExperiments={6}
      hypotheses={[]}
      experiments={[]}
      evaluations={[]}
      taskEntityLinks={[
        taskEntityLinkRecord({
          taskId: "T8",
          entityKind: "experiment",
          entityId: "EX3",
        }),
        taskEntityLinkRecord({
          taskId: "T8",
          entityKind: "evaluation",
          entityId: "EV4",
        }),
        taskEntityLinkRecord({
          taskId: "T8",
          entityKind: "artifact",
          entityId: "ART2",
        }),
        taskEntityLinkRecord({
          taskId: "T8",
          entityKind: "measurement",
          entityId: "M7",
        }),
      ]}
      taskActivities={[]}
      hypothesisActivities={[]}
      experimentActivities={[]}
      evaluationActivities={[]}
      events={[]}
      onDashboardCommand={() => {}}
      terminalSize={{ columns: 112, rows: 28 }}
    />,
  );

  try {
    await waitForFrame();

    const frame = instance.lastFrame() ?? "";
    expect(frame).toContain("● [T8] Test edit-aware scoring");
    expect(frame).toContain("│ → EX3 EV4 M7 ART2");
    expect(frame).not.toContain("│     → EX3 EV4 M7 ART2");
  } finally {
    instance.unmount();
  }
});

test("done tasks sort latest first and collapse duplicate older titles", async () => {
  const instance = renderInk(
    <FullscreenDashboard
      workspace="/tmp/support-agent"
      statusLine="active session"
      dashboardMessage={undefined}
      project={undefined}
      session={undefined}
      tasks={[
        taskRecord({
          id: "T1",
          title: "Record baseline eval",
          kind: "baseline",
          status: "done",
          completedAt: "2026-01-01T00:00:03Z",
        }),
        taskRecord({
          id: "T2",
          title: "Plan after Researcher task completion",
          kind: "plan",
          status: "done",
          completedAt: "2026-01-01T00:00:05Z",
        }),
        taskRecord({
          id: "T3",
          title: "Plan after Researcher task completion",
          kind: "plan",
          status: "done",
          completedAt: "2026-01-01T00:00:06Z",
        }),
        taskRecord({
          id: "T4",
          title: "Validate final candidate",
          kind: "review",
          status: "done",
          completedAt: "2026-01-01T00:00:07Z",
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
      terminalSize={{ columns: 112, rows: 28 }}
    />,
  );

  try {
    await waitForFrame();

    const frame = instance.lastFrame() ?? "";
    const validateIndex = frame.indexOf("● [T4] Validate final candidate");
    const planIndex = frame.indexOf("● [T3] Plan next step");
    const baselineIndex = frame.indexOf("● [T1] Record baseline eval");
    expect(validateIndex).toBeGreaterThanOrEqual(0);
    expect(planIndex).toBeGreaterThan(validateIndex);
    expect(baselineIndex).toBeGreaterThan(planIndex);
    expect(frame).not.toContain("● [T2] Plan next step");
    expect(frame).toContain("+ 1 older done task");
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

test("taskOutputLineForDashboard truncates link rows with a hidden count", () => {
  expect(
    taskOutputLineForDashboard({
      labels: ["EX3", "EV4", "ART2", "A7"],
      width: 12,
    }),
  ).toBe("→ EX3 EV4 +2");
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

test("readableDashboardTaskTitle humanizes repeated planning continuation titles", () => {
  const task: DashboardTask = {
    id: "T2",
    title: "Plan after Researcher task completion",
    status: "done",
    kind: "task",
    taskKind: "plan",
  };

  expect(readableDashboardTaskTitle({ task })).toBe("Plan next step");
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
  id = "T1",
  title,
  kind,
  status,
  completedAt,
}: {
  id?: string;
  title: string;
  kind: TaskRecord["kind"];
  status: TaskRecord["status"];
  completedAt?: string;
}): TaskRecord {
  return {
    id,
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
    completed_at: completedAt,
    updated_at: completedAt ?? "2026-01-01T00:00:00Z",
  };
}

function taskEntityLinkRecord({
  taskId,
  entityKind,
  entityId,
}: {
  taskId: string;
  entityKind: TaskEntityLinkRecord["entity_kind"];
  entityId: string;
}): TaskEntityLinkRecord {
  return {
    project_id: "P1",
    task_id: taskId,
    entity_kind: entityKind,
    entity_id: entityId,
    relationship: "created",
    created_at: "2026-01-01T00:00:01Z",
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
