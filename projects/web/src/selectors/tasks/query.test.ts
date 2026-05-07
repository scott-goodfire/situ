import { describe, expect, test } from "bun:test";
import type { TaskRecord } from "@situ/protocol";
import type { ProjectWorkspaceData } from "../../features/project-workspace/types";
import { tasksForProject } from "./query";

describe("tasksForProject", () => {
  test("filters tasks by the active project record id instead of the route id", () => {
    const routeProjectId = "cd826e9f8090d9b7";
    const activeProjectRecordId = "project_cd826e9f8090d9b7_004";
    const otherProjectRecordId = "project_cd826e9f8090d9b7_003";
    const data = {
      projectId: routeProjectId,
      activeProjectRecordId,
      tasks: [
        taskRecord({
          id: "task_project_cd826e9f8090d9b7_004_001",
          projectId: activeProjectRecordId,
          title: "Plan the resumed research pass",
        }),
        taskRecord({
          id: "task_project_cd826e9f8090d9b7_003_001",
          projectId: otherProjectRecordId,
          title: "Previous session task",
        }),
      ],
    } as ProjectWorkspaceData;

    expect(tasksForProject({ data }).map((task) => task.id)).toEqual([
      "task_project_cd826e9f8090d9b7_004_001",
    ]);
  });
});

function taskRecord({
  id,
  projectId,
  title,
}: {
  id: string;
  projectId: string;
  title: string;
}): TaskRecord {
  return {
    id,
    project_id: projectId,
    created_in_session_id: "session_0004",
    title,
    content: title,
    kind: "plan",
    status: "backlog",
    priority: "normal",
    source_kind: "manager",
    assignee_id: null,
    parent_task_id: null,
    payload: {},
    pydantic_run_id: null,
    conversation_id: null,
    result_summary: null,
    created_at: "2026-05-06T07:00:00.000Z",
    available_at: "2026-05-06T07:00:00.000Z",
    claimed_in_session_id: null,
    claimed_at: null,
    completed_in_session_id: null,
    completed_at: null,
    updated_at: "2026-05-06T07:00:00.000Z",
  };
}
