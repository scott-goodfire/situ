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
  ProjectSnapshotResponse,
} from "../project-discovery/types";

const RUNNING_PROJECT_ID = "0123456789abcdef";
const STOPPED_PROJECT_ID = "abcdef0123456789";
const UNKNOWN_PROJECT_ID = "ffffffffffffffff";

describe("discovery api", () => {
  test("returns an empty project list when local Almanac state is missing", async () => {
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
          status_reason: "No active session file found",
          started_at: null,
          last_seen_at: null,
          url: null,
        },
      ]);
    });
  });

  test("reads stopped project metadata from almanac sqlite", async () => {
    await withTemporaryHome(async ({ home }) => {
      const workspace = join(home, "stopped-almanac-workspace");
      mkdirSync(workspace);
      writeProjectDatabase({
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
          label: "stopped-almanac-workspace",
          workspace,
          objective_title: "Improve stopped project score",
          status: "stopped",
          status_reason: "No active session file found",
          started_at: null,
          last_seen_at: "2026-05-05T01:00:00.000Z",
          url: null,
        },
      ]);
    });
  });

  test("lists registry-only projects with missing workspaces", async () => {
    await withTemporaryHome(async ({ home }) => {
      writeRegistryDatabase({
        home,
        projectId: STOPPED_PROJECT_ID,
        repoPath: join(home, "missing-workspace"),
        label: "Missing workspace",
        lastSeenAt: "2026-05-05T02:00:00.000Z",
      });

      const app = createTestDiscoveryApi({ home });
      const response = await app.request("/api/projects");
      const payload = (await response.json()) as ProjectListResponse;

      expect(response.status).toBe(200);
      expect(payload.projects).toEqual([
        {
          project_id: STOPPED_PROJECT_ID,
          label: "missing-workspace",
          workspace: join(home, "missing-workspace"),
          objective_title: null,
          status: "missing_workspace",
          status_reason: "Workspace path no longer exists",
          started_at: null,
          last_seen_at: "2026-05-05T02:00:00.000Z",
          url: null,
        },
      ]);
    });
  });

  test("backfills the registry from existing project directories", async () => {
    await withTemporaryHome(async ({ home }) => {
      makeProjectDirectory({ home, projectId: STOPPED_PROJECT_ID });

      const app = createTestDiscoveryApi({ home });
      const response = await app.request("/api/projects");
      expect(response.status).toBe(200);

      const database = new Database(join(home, ".almanac", "almanac.sqlite"), {
        readonly: true,
      });
      try {
        const row = database
          .query("SELECT project_id, label FROM projects WHERE project_id = ?")
          .get(STOPPED_PROJECT_ID) as { project_id: string; label: string } | null;

        expect(row).toEqual({
          project_id: STOPPED_PROJECT_ID,
          label: STOPPED_PROJECT_ID,
        });
      } finally {
        database.close();
      }
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
            workspace: "/tmp/almanac-running-workspace",
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
        expect(projectsPayload.projects[0]?.label).toBe("almanac-running-workspace");
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

  test("returns a durable project snapshot without a running session", async () => {
    await withTemporaryHome(async ({ home }) => {
      const workspace = join(home, "stopped-snapshot-workspace");
      mkdirSync(workspace);
      writeProjectSnapshotDatabase({
        home,
        projectId: STOPPED_PROJECT_ID,
        repoPath: workspace,
      });

      const app = createTestDiscoveryApi({ home });
      const response = await app.request(
        `/api/projects/${STOPPED_PROJECT_ID}/snapshot`,
      );
      const payload = (await response.json()) as ProjectSnapshotResponse;

      expect(response.status).toBe(200);
      expect(payload.project?.status).toBe("stopped");
      expect(payload.snapshot?.cursor).toBe(1);
      expect(payload.snapshot?.objectives[0]?.title).toBe("Improve snapshot score");
      expect(payload.snapshot?.sessions[0]?.id).toBe("session_0001");
      expect(payload.snapshot?.hypotheses[0]?.id).toBe("hyp_0001");
      expect(payload.snapshot?.experiments[0]?.id).toBe("exp_0001");
      expect(payload.snapshot?.evaluations[0]?.id).toBe("eval_0001");
      expect(payload.snapshot?.hypothesis_experiment_links[0]).toEqual({
        hypothesis_id: "hyp_0001",
        experiment_id: "exp_0001",
        created_at: "2026-05-05T01:05:00.000Z",
      });
      expect(payload.snapshot?.hypothesis_activities[0]?.payload).toEqual({
        activity_type: "note",
      });
      expect(payload.snapshot?.experiment_activities[0]?.payload).toEqual({
        activity_type: "result",
      });
      expect(payload.snapshot?.evaluation_activities[0]?.payload).toEqual({
        activity_type: "evidence",
      });
      expect(payload.snapshot?.artifacts[0]?.path).toBe("artifacts/stdout.txt");
      expect(payload.snapshot?.events[0]?.payload).toEqual({ ok: true });
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

  test("returns null project snapshot data for an unknown project", async () => {
    await withTemporaryHome(async ({ home }) => {
      const app = createTestDiscoveryApi({ home });
      const response = await app.request(`/api/projects/${UNKNOWN_PROJECT_ID}/snapshot`);
      const payload = (await response.json()) as ProjectSnapshotResponse;

      expect(response.status).toBe(200);
      expect(payload).toEqual({
        project: null,
        snapshot: null,
      });
    });
  });
});

async function withTemporaryHome(
  run: ({ home }: { home: string }) => Promise<void>,
): Promise<void> {
  const home = mkdtempSync(join(tmpdir(), "almanac-web-test-home-"));

  try {
    await run({ home });
  } finally {
    rmSync(home, { recursive: true, force: true });
  }
}

function writeRegistryDatabase({
  home,
  projectId,
  repoPath,
  label,
  lastSeenAt,
}: {
  home: string;
  projectId: string;
  repoPath: string;
  label: string;
  lastSeenAt: string;
}): void {
  const databasePath = join(home, ".almanac", "almanac.sqlite");
  mkdirSync(join(home, ".almanac"), { recursive: true });
  const database = new Database(databasePath);

  try {
    database.run(`
      CREATE TABLE projects (
        project_id TEXT PRIMARY KEY,
        repo_path TEXT,
        label TEXT,
        discovered_at TEXT NOT NULL,
        last_seen_at TEXT,
        last_opened_at TEXT,
        archived_at TEXT
      )
    `);
    database
      .query(`
        INSERT INTO projects
          (project_id, repo_path, label, discovered_at, last_seen_at, last_opened_at, archived_at)
        VALUES (?, ?, ?, ?, ?, NULL, NULL)
      `)
      .run(projectId, repoPath, label, "2026-05-05T00:00:00.000Z", lastSeenAt);
  } finally {
    database.close();
  }
}

function createTestDiscoveryApi({ home }: { home: string }) {
  return createDiscoveryApi({
    almanacHome: join(home, ".almanac"),
  });
}

function makeProjectDirectory({
  home,
  projectId,
}: {
  home: string;
  projectId: string;
}): string {
  const projectDirectory = join(home, ".almanac", "projects", projectId);
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

function writeProjectDatabase({
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
  const projectDirectory = makeProjectDirectory({ home, projectId });
  const database = new Database(join(projectDirectory, "almanac.sqlite"));

  try {
    database.run(`
      CREATE TABLE projects (
        id TEXT PRIMARY KEY,
        repo_path TEXT NOT NULL,
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL
      )
    `);
    database.run(`
      CREATE TABLE sessions (
        id TEXT PRIMARY KEY,
        project_id TEXT NOT NULL,
        status TEXT NOT NULL,
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL
      )
    `);
    database.run(`
      CREATE TABLE objectives (
        id TEXT PRIMARY KEY,
        session_id TEXT NOT NULL UNIQUE,
        title TEXT NOT NULL,
        description TEXT NOT NULL,
        status TEXT NOT NULL,
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL
      )
    `);
    database
      .query(
        "INSERT INTO projects (id, repo_path, created_at, updated_at) VALUES (?, ?, ?, ?)",
      )
      .run(projectId, repoPath, updatedAt, updatedAt);
    database
      .query(
        "INSERT INTO sessions (id, project_id, status, created_at, updated_at) VALUES (?, ?, ?, ?, ?)",
      )
      .run("session_0001", projectId, "closed", updatedAt, updatedAt);
    database
      .query(
        "INSERT INTO objectives (id, session_id, title, description, status, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?)",
      )
      .run(
        "obj_session_0001",
        "session_0001",
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

function writeProjectSnapshotDatabase({
  home,
  projectId,
  repoPath,
}: {
  home: string;
  projectId: string;
  repoPath: string;
}): void {
  const projectDirectory = makeProjectDirectory({ home, projectId });
  const database = new Database(join(projectDirectory, "almanac.sqlite"));

  try {
    database.run(`
      CREATE TABLE projects (
        id TEXT PRIMARY KEY,
        repo_path TEXT NOT NULL,
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL
      )
    `);
    database.run(`
      CREATE TABLE sessions (
        id TEXT PRIMARY KEY,
        project_id TEXT NOT NULL,
        status TEXT NOT NULL,
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL
      )
    `);
    database.run(`
      CREATE TABLE objectives (
        id TEXT PRIMARY KEY,
        session_id TEXT NOT NULL UNIQUE,
        title TEXT NOT NULL,
        description TEXT NOT NULL,
        status TEXT NOT NULL,
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL
      )
    `);
    database.run(`
      CREATE TABLE research_contexts (
        id TEXT PRIMARY KEY,
        session_id TEXT NOT NULL UNIQUE,
        body TEXT NOT NULL,
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL
      )
    `);
    database.run(`
      CREATE TABLE hypotheses (
        id TEXT PRIMARY KEY,
        session_id TEXT NOT NULL,
        title TEXT NOT NULL,
        summary TEXT NOT NULL,
        status TEXT NOT NULL,
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL
      )
    `);
    database.run(`
      CREATE TABLE experiments (
        id TEXT PRIMARY KEY,
        session_id TEXT NOT NULL,
        status TEXT NOT NULL,
        title TEXT NOT NULL,
        summary TEXT NOT NULL,
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL
      )
    `);
    database.run(`
      CREATE TABLE evaluations (
        id TEXT PRIMARY KEY,
        session_id TEXT NOT NULL,
        status TEXT NOT NULL,
        title TEXT NOT NULL,
        summary TEXT NOT NULL,
        associated_experiment_id TEXT,
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL
      )
    `);
    database.run(`
      CREATE TABLE hypothesis_experiment_links (
        hypothesis_id TEXT NOT NULL,
        experiment_id TEXT NOT NULL,
        created_at TEXT NOT NULL,
        PRIMARY KEY (hypothesis_id, experiment_id)
      )
    `);
    database.run(`
      CREATE TABLE hypothesis_activities (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        hypothesis_id TEXT NOT NULL,
        actor TEXT NOT NULL,
        kind TEXT NOT NULL,
        body TEXT NOT NULL,
        payload_json TEXT NOT NULL,
        created_at TEXT NOT NULL
      )
    `);
    database.run(`
      CREATE TABLE experiment_activities (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        experiment_id TEXT NOT NULL,
        actor TEXT NOT NULL,
        kind TEXT NOT NULL,
        body TEXT NOT NULL,
        payload_json TEXT NOT NULL,
        created_at TEXT NOT NULL
      )
    `);
    database.run(`
      CREATE TABLE evaluation_activities (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        evaluation_id TEXT NOT NULL,
        actor TEXT NOT NULL,
        kind TEXT NOT NULL,
        body TEXT NOT NULL,
        payload_json TEXT NOT NULL,
        created_at TEXT NOT NULL
      )
    `);
    database.run(`
      CREATE TABLE artifacts (
        id TEXT PRIMARY KEY,
        session_id TEXT NOT NULL,
        associated_entity_kind TEXT NOT NULL,
        associated_entity_id TEXT NOT NULL,
        kind TEXT NOT NULL,
        title TEXT NOT NULL,
        path TEXT NOT NULL,
        media_type TEXT,
        size_bytes INTEGER,
        created_at TEXT NOT NULL
      )
    `);
    database.run(`
      CREATE TABLE events (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        session_id TEXT,
        type TEXT NOT NULL,
        message TEXT NOT NULL,
        payload_json TEXT NOT NULL,
        created_at TEXT NOT NULL
      )
    `);

    database
      .query(`
        INSERT INTO projects
          (id, repo_path, created_at, updated_at)
        VALUES (?, ?, ?, ?)
      `)
      .run(
        projectId,
        repoPath,
        "2026-05-05T01:00:00.000Z",
        "2026-05-05T01:10:00.000Z",
      );
    database
      .query(`
        INSERT INTO sessions
          (id, project_id, status, created_at, updated_at)
        VALUES (?, ?, ?, ?, ?)
      `)
      .run(
        "session_0001",
        projectId,
        "closed",
        "2026-05-05T01:01:00.000Z",
        "2026-05-05T01:10:00.000Z",
      );
    database
      .query(`
        INSERT INTO objectives
          (id, session_id, title, description, status, created_at, updated_at)
        VALUES (?, ?, ?, ?, ?, ?, ?)
      `)
      .run(
        "obj_session_0001",
        "session_0001",
        "Improve snapshot score",
        "Capture durable state after disconnect.",
        "active",
        "2026-05-05T01:00:00.000Z",
        "2026-05-05T01:10:00.000Z",
      );
    database
      .query(`
        INSERT INTO research_contexts
          (id, session_id, body, created_at, updated_at)
        VALUES (?, ?, ?, ?, ?)
      `)
      .run(
        "rctx_session_0001",
        "session_0001",
        "Run local evals.",
        "2026-05-05T01:00:00.000Z",
        "2026-05-05T01:10:00.000Z",
      );
    database
      .query(`
        INSERT INTO hypotheses
          (id, session_id, title, summary, status, created_at, updated_at)
        VALUES (?, ?, ?, ?, ?, ?, ?)
      `)
      .run(
        "hyp_0001",
        "session_0001",
        "Durable snapshots preserve context",
        "Stopped sessions should still render project data.",
        "active",
        "2026-05-05T01:02:00.000Z",
        "2026-05-05T01:10:00.000Z",
      );
    database
      .query(`
        INSERT INTO experiments
          (id, session_id, status, title, summary, created_at, updated_at)
        VALUES (?, ?, ?, ?, ?, ?, ?)
      `)
      .run(
        "exp_0001",
        "session_0001",
        "closed",
        "Disconnect the session",
        "Verify web state remains readable.",
        "2026-05-05T01:03:00.000Z",
        "2026-05-05T01:10:00.000Z",
      );
    database
      .query(`
        INSERT INTO evaluations
          (id, session_id, status, title, summary, associated_experiment_id, created_at, updated_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?)
      `)
      .run(
        "eval_0001",
        "session_0001",
        "closed",
        "Snapshot evidence",
        "The project page renders without a live session.",
        "exp_0001",
        "2026-05-05T01:04:00.000Z",
        "2026-05-05T01:10:00.000Z",
      );
    database
      .query(`
        INSERT INTO hypothesis_experiment_links
          (hypothesis_id, experiment_id, created_at)
        VALUES (?, ?, ?)
      `)
      .run("hyp_0001", "exp_0001", "2026-05-05T01:05:00.000Z");
    database
      .query(`
        INSERT INTO hypothesis_activities
          (hypothesis_id, actor, kind, body, payload_json, created_at)
        VALUES (?, ?, ?, ?, ?, ?)
      `)
      .run(
        "hyp_0001",
        "agent",
        "comment",
        "Added a hypothesis note.",
        JSON.stringify({ activity_type: "note" }),
        "2026-05-05T01:06:00.000Z",
      );
    database
      .query(`
        INSERT INTO experiment_activities
          (experiment_id, actor, kind, body, payload_json, created_at)
        VALUES (?, ?, ?, ?, ?, ?)
      `)
      .run(
        "exp_0001",
        "agent",
        "comment",
        "Recorded experiment output.",
        JSON.stringify({ activity_type: "result" }),
        "2026-05-05T01:07:00.000Z",
      );
    database
      .query(`
        INSERT INTO evaluation_activities
          (evaluation_id, actor, kind, body, payload_json, created_at)
        VALUES (?, ?, ?, ?, ?, ?)
      `)
      .run(
        "eval_0001",
        "agent",
        "comment",
        "Recorded evidence.",
        JSON.stringify({ activity_type: "evidence" }),
        "2026-05-05T01:08:00.000Z",
      );
    database
      .query(`
        INSERT INTO artifacts
          (id, session_id, associated_entity_kind, associated_entity_id, kind, title, path, media_type, size_bytes, created_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `)
      .run(
        "artifact_0001",
        "session_0001",
        "experiment",
        "exp_0001",
        "text",
        "stdout",
        "artifacts/stdout.txt",
        "text/plain",
        42,
        "2026-05-05T01:09:00.000Z",
      );
    database
      .query(`
        INSERT INTO events
          (session_id, type, message, payload_json, created_at)
        VALUES (?, ?, ?, ?, ?)
      `)
      .run(
        "session_0001",
        "session.closed",
        "Closed session_0001",
        JSON.stringify({ ok: true }),
        "2026-05-05T01:10:00.000Z",
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
