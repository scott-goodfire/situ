import { expect, test } from "bun:test";
import type { TaskRecord } from "@situ/protocol";
import { renderInk } from "../../testing/ink-render.js";
import {
  FullscreenDashboard,
  readableDashboardTaskTitle,
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
    expect(frame).toContain("instrumentation and…");
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

test("taskLabelFromId only accepts canonical task ids", () => {
  expect(taskLabelFromId({ id: "T7" })).toBe("[T7]");
  expect(taskLabelFromId({ id: "task_0007" })).toBeUndefined();
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

async function waitForFrame() {
  await new Promise((resolveFrame) => {
    setTimeout(resolveFrame, 20);
  });
}
