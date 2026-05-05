import { access, mkdir } from "node:fs/promises";
import { basename, dirname, resolve } from "node:path";
import { openSqliteDatabase } from "./sqlite";

export type ProjectRegistryRow = {
  project_id: string;
  repo_path: string | null;
  label: string | null;
  discovered_at: string;
  last_seen_at: string | null;
  last_opened_at: string | null;
  archived_at: string | null;
};

export type ProjectRegistryUpsert = {
  projectId: string;
  repoPath: string | null;
  label?: string | null;
  lastSeenAt?: string | null;
  lastOpenedAt?: string | null;
};

const REGISTRY_SCHEMA_SQL = `
CREATE TABLE IF NOT EXISTS projects (
  project_id TEXT PRIMARY KEY,
  repo_path TEXT,
  label TEXT,
  discovered_at TEXT NOT NULL,
  last_seen_at TEXT,
  last_opened_at TEXT,
  archived_at TEXT
);
`;

export async function readProjectRegistry({
  situHome,
}: {
  situHome: string;
}): Promise<ProjectRegistryRow[]> {
  const databasePath = registryDatabasePath({ situHome });
  const exists = await pathExists({ path: databasePath });
  if (!exists) {
    return [];
  }

  try {
    const database = await openSqliteDatabase({
      path: databasePath,
      readonly: true,
      fileMustExist: true,
    });

    try {
      return database.all(
        `
        SELECT
          project_id,
          repo_path,
          label,
          discovered_at,
          last_seen_at,
          last_opened_at,
          archived_at
        FROM projects
        WHERE archived_at IS NULL
        ORDER BY COALESCE(last_seen_at, last_opened_at, discovered_at) DESC
        `,
      ) as ProjectRegistryRow[];
    } finally {
      database.close();
    }
  } catch (error) {
    if (isMissingPathError({ error })) {
      return [];
    }

    throw error;
  }
}

export async function upsertProjectRegistryRows({
  situHome,
  rows,
}: {
  situHome: string;
  rows: ProjectRegistryUpsert[];
}): Promise<void> {
  if (rows.length === 0) {
    return;
  }

  const databasePath = registryDatabasePath({ situHome });
  await mkdir(dirname(databasePath), { recursive: true });
  const database = await openSqliteDatabase({ path: databasePath });

  try {
    database.exec(REGISTRY_SCHEMA_SQL);

    for (const row of rows) {
      const now = new Date().toISOString();
      const label =
        row.label ??
        projectLabel({ projectId: row.projectId, workspace: row.repoPath });
      database.run(
        `
        INSERT INTO projects
          (project_id, repo_path, label, discovered_at, last_seen_at, last_opened_at, archived_at)
        VALUES (?, ?, ?, ?, ?, ?, NULL)
        ON CONFLICT(project_id) DO UPDATE SET
          repo_path = COALESCE(excluded.repo_path, projects.repo_path),
          label = COALESCE(excluded.label, projects.label),
          last_seen_at = COALESCE(excluded.last_seen_at, projects.last_seen_at),
          last_opened_at = COALESCE(excluded.last_opened_at, projects.last_opened_at),
          archived_at = NULL
        `,
        [
          row.projectId,
          row.repoPath,
          label,
          now,
          row.lastSeenAt ?? null,
          row.lastOpenedAt ?? null,
        ],
      );
    }
  } finally {
    database.close();
  }
}

export function registryDatabasePath({
  situHome,
}: {
  situHome: string;
}): string {
  return resolve(situHome, "situ.sqlite");
}

function projectLabel({
  projectId,
  workspace,
}: {
  projectId: string;
  workspace: string | null;
}): string {
  if (!workspace) {
    return projectId;
  }

  return basename(workspace) || workspace;
}

function isMissingPathError({ error }: { error: unknown }): boolean {
  return error instanceof Error && "code" in error && error.code === "ENOENT";
}

async function pathExists({ path }: { path: string }): Promise<boolean> {
  try {
    await access(path);
    return true;
  } catch (error) {
    if (isMissingPathError({ error })) {
      return false;
    }

    throw error;
  }
}
