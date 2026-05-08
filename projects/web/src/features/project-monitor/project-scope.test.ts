import { describe, expect, test } from "bun:test";
import type { ProjectRecord, SessionRecord } from "@situ/protocol";
import { currentProjectRecordId } from "./project-scope";

describe("currentProjectRecordId", () => {
  test("pins the workspace view to the route project before considering other active sessions", () => {
    expect(
      currentProjectRecordId({
        selectedProjectId: "P1",
        workspaceId: "W1",
        projects: [
          projectRecord({ id: "P1", workspaceId: "W1", status: "active" }),
          projectRecord({ id: "P2", workspaceId: "W1", status: "active" }),
        ],
        sessions: [
          sessionRecord({ id: "S1", workspaceId: "W1", projectId: "P1" }),
          sessionRecord({ id: "S2", workspaceId: "W1", projectId: "P2" }),
        ],
      }),
    ).toBe("P1");
  });

  test("falls back to legacy workspace routes when no project id matches the route", () => {
    expect(
      currentProjectRecordId({
        workspaceId: "W1",
        projects: [
          projectRecord({ id: "P1", workspaceId: "W1", status: "closed" }),
          projectRecord({ id: "P2", workspaceId: "W1", status: "active" }),
        ],
        sessions: [],
      }),
    ).toBe("P2");
  });

  test("pins workspace routes to the session nearest the discovered live connection", () => {
    expect(
      currentProjectRecordId({
        sessionStartedAt: "2026-05-06T07:10:00.000Z",
        workspaceId: "W1",
        projects: [
          projectRecord({ id: "P1", workspaceId: "W1", status: "active" }),
          projectRecord({ id: "P2", workspaceId: "W1", status: "active" }),
          projectRecord({ id: "P3", workspaceId: "W1", status: "active" }),
        ],
        sessions: [
          sessionRecord({
            id: "S1",
            workspaceId: "W1",
            projectId: "P1",
            createdAt: "2026-05-06T07:00:00.000Z",
          }),
          sessionRecord({
            id: "S2",
            workspaceId: "W1",
            projectId: "P2",
            createdAt: "2026-05-06T07:10:08.000Z",
          }),
          sessionRecord({
            id: "S3",
            workspaceId: "W1",
            projectId: "P3",
            createdAt: "2026-05-06T07:30:00.000Z",
          }),
        ],
      }),
    ).toBe("P2");
  });
});

function projectRecord({
  id,
  workspaceId,
  status,
}: {
  id: string;
  workspaceId: string;
  status: ProjectRecord["status"];
}): ProjectRecord {
  return {
    id,
    workspace_id: workspaceId,
    title: id,
    objective: id,
    research_context: "",
    status,
    created_at: `2026-05-06T07:00:00.000Z`,
    updated_at: `2026-05-06T07:00:00.000Z`,
  };
}

function sessionRecord({
  id,
  workspaceId,
  projectId,
  createdAt = "2026-05-06T07:00:00.000Z",
}: {
  id: string;
  workspaceId: string;
  projectId: string;
  createdAt?: string;
}): SessionRecord {
  return {
    id,
    workspace_id: workspaceId,
    project_id: projectId,
    status: "active",
    created_at: createdAt,
    updated_at: createdAt,
  };
}
