import { describe, expect, test } from "bun:test";
import { createServer, type Server } from "node:http";
import {
  mkdirSync,
  mkdtempSync,
  rmSync,
  writeFileSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { Database } from "bun:sqlite";
import { createDiscoveryApi } from "./discovery-api";
import type {
  ProjectListResponse,
  ProjectSessionResponse,
} from "../project-discovery/types";

const RUNNING_PROJECT_ID = "0123456789abcdef";
const STOPPED_PROJECT_ID = "abcdef0123456789";
const UNKNOWN_PROJECT_ID = "ffffffffffffffff";

describe("discovery api", () => {
  test("returns an empty project list when local Situ state is missing", async () => {
    await withTemporaryHome(async ({ home }) => {
      const app = createTestDiscoveryApi({ home });
      const response = await app.request("/api/projects");
      const payload = (await response.json()) as ProjectListResponse;

      expect(response.status).toBe(200);
      expect(payload.projects).toEqual([]);
    });
  });

  test("lists stopped projects from local project directories", async () => {
    await withTemporaryHome(async ({ home }) => {
      makeProjectDirectory({ home, projectId: STOPPED_PROJECT_ID });

      const app = createTestDiscoveryApi({ home });
      const response = await app.request("/api/projects");
      const payload = (await response.json()) as ProjectListResponse;

      expect(response.status).toBe(200);
      expect(payload.projects).toEqual([
        {
          project_id: STOPPED_PROJECT_ID,
          label: STOPPED_PROJECT_ID,
          workspace: null,
          objective_title: null,
          status: "stopped",
          status_reason: "No active session found",
          started_at: null,
          last_seen_at: null,
          url: null,
        },
      ]);
    });
  });

  test("reads stopped project metadata from situ sqlite", async () => {
    await withTemporaryHome(async ({ home }) => {
      const workspace = join(home, "stopped-situ-workspace");
      mkdirSync(workspace);
      writeProductDatabase({
        home,
        projectId: STOPPED_PROJECT_ID,
        repoPath: workspace,
        objectiveTitle: "Improve stopped project score",
        updatedAt: "2026-05-05T01:00:00.000Z",
      });

      const app = createTestDiscoveryApi({ home });
      const response = await app.request("/api/projects");
      const payload = (await response.json()) as ProjectListResponse;

      expect(response.status).toBe(200);
      expect(payload.projects).toEqual([
        {
          project_id: STOPPED_PROJECT_ID,
          label: "stopped-situ-workspace",
          workspace,
          objective_title: "Improve stopped project score",
          status: "stopped",
          status_reason: "No active session found",
          started_at: null,
          last_seen_at: "2026-05-05T01:00:00.000Z",
          url: null,
        },
      ]);
    });
  });

  test("returns a healthy running session for a project", async () => {
    await withTemporaryHome(async ({ home }) => {
      const token = "test-token";
      const healthServer = await startHealthServer({ token });
      try {
        makeProjectDirectory({ home, projectId: STOPPED_PROJECT_ID });
        writeSessionRecord({
          home,
          projectId: RUNNING_PROJECT_ID,
          session: {
            project_id: RUNNING_PROJECT_ID,
            workspace: "/tmp/situ-running-workspace",
            pid: 12345,
            port: healthServer.port,
            token,
            url: healthServer.url,
            started_at: "2026-05-05T00:00:00.000Z",
          },
        });

        const app = createTestDiscoveryApi({ home });
        const projectsResponse = await app.request("/api/projects");
        const projectsPayload = (await projectsResponse.json()) as ProjectListResponse;

        expect(projectsResponse.status).toBe(200);
        expect(projectsPayload.projects.map((project) => project.project_id)).toEqual([
          RUNNING_PROJECT_ID,
          STOPPED_PROJECT_ID,
        ]);
        expect(projectsPayload.projects[0]?.status).toBe("running");
        expect(projectsPayload.projects[0]?.status_reason).toBe(
          "Session health check passed",
        );
        expect(projectsPayload.projects[0]?.label).toBe("situ-running-workspace");
        expect(projectsPayload.projects[0]?.last_seen_at).toBe(
          "2026-05-05T00:00:00.000Z",
        );

        const sessionResponse = await app.request(
          `/api/projects/${RUNNING_PROJECT_ID}/session`,
        );
        const sessionPayload = (await sessionResponse.json()) as ProjectSessionResponse;

        expect(sessionResponse.status).toBe(200);
        expect(sessionPayload.project?.status).toBe("running");
        expect(sessionPayload.session?.token).toBe(token);
        expect(sessionPayload.session?.url).toBe(healthServer.url);
      } finally {
        await healthServer.close();
      }
    });
  });

  test("returns null project data for an unknown project session lookup", async () => {
    await withTemporaryHome(async ({ home }) => {
      const app = createTestDiscoveryApi({ home });
      const response = await app.request(`/api/projects/${UNKNOWN_PROJECT_ID}/session`);
      const payload = (await response.json()) as ProjectSessionResponse;

      expect(response.status).toBe(200);
      expect(payload).toEqual({
        project: null,
        session: null,
      });
    });
  });
});

async function withTemporaryHome(
  run: ({ home }: { home: string }) => Promise<void>,
): Promise<void> {
  const home = mkdtempSync(join(tmpdir(), "situ-web-test-home-"));

  try {
    await run({ home });
  } finally {
    rmSync(home, { recursive: true, force: true });
  }
}

function createTestDiscoveryApi({ home }: { home: string }) {
  return createDiscoveryApi({
    situHome: join(home, ".situ"),
  });
}

function makeProjectDirectory({
  home,
  projectId,
}: {
  home: string;
  projectId: string;
}): string {
  const projectDirectory = join(home, ".situ", "projects", projectId);
  mkdirSync(projectDirectory, { recursive: true });
  return projectDirectory;
}

function writeSessionRecord({
  home,
  projectId,
  session,
}: {
  home: string;
  projectId: string;
  session: Record<string, unknown>;
}): void {
  const projectDirectory = makeProjectDirectory({ home, projectId });
  writeFileSync(join(projectDirectory, "session.json"), `${JSON.stringify(session)}\n`);
}

function writeProductDatabase({
  home,
  projectId,
  repoPath,
  objectiveTitle,
  updatedAt,
}: {
  home: string;
  projectId: string;
  repoPath: string;
  objectiveTitle: string;
  updatedAt: string;
}): void {
  mkdirSync(join(home, ".situ"), { recursive: true });
  const database = new Database(join(home, ".situ", "situ.sqlite"));

  try {
    database.run(`
      CREATE TABLE workspaces (
        id TEXT PRIMARY KEY,
        repo_path TEXT NOT NULL,
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL
      )
    `);
    database.run(`
      CREATE TABLE projects (
        id TEXT PRIMARY KEY,
        workspace_id TEXT NOT NULL,
        title TEXT NOT NULL,
        objective TEXT NOT NULL,
        research_context TEXT NOT NULL,
        status TEXT NOT NULL,
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL
      )
    `);
    database.run(`
      CREATE TABLE sessions (
        id TEXT PRIMARY KEY,
        workspace_id TEXT NOT NULL,
        project_id TEXT,
        status TEXT NOT NULL,
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL
      )
    `);
    database
      .query(
        "INSERT INTO workspaces (id, repo_path, created_at, updated_at) VALUES (?, ?, ?, ?)",
      )
      .run(projectId, repoPath, updatedAt, updatedAt);
    database
      .query(
        `
        INSERT INTO projects
          (id, workspace_id, title, objective, research_context, status, created_at, updated_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?)
      `,
      )
      .run(
        projectId,
        projectId,
        objectiveTitle,
        objectiveTitle,
        "",
        "active",
        updatedAt,
        updatedAt,
      );
  } finally {
    database.close();
  }
}

async function startHealthServer({
  token,
}: {
  token: string;
}): Promise<{
  close: () => Promise<void>;
  port: number;
  url: string;
}> {
  const server = createServer((request, response) => {
    if (
      request.url === "/health" &&
      request.headers.authorization === `Bearer ${token}`
    ) {
      response.writeHead(200, { "content-type": "application/json" });
      response.end("{}");
      return;
    }

    response.writeHead(401, { "content-type": "application/json" });
    response.end("{}");
  });

  await listen(server);
  const address = server.address();
  if (!address || typeof address === "string") {
    throw new Error("test health server did not bind to a TCP port");
  }

  return {
    close: () => close(server),
    port: address.port,
    url: `http://127.0.0.1:${address.port}`,
  };
}

async function listen(server: Server): Promise<void> {
  await new Promise<void>((resolveListen, rejectListen) => {
    server.once("error", rejectListen);
    server.listen(0, "127.0.0.1", () => {
      server.off("error", rejectListen);
      resolveListen();
    });
  });
}

async function close(server: Server): Promise<void> {
  await new Promise<void>((resolveClose, rejectClose) => {
    server.close((error) => {
      if (error) {
        rejectClose(error);
        return;
      }

      resolveClose();
    });
  });
}
