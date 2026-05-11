import { mkdir, mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { Database } from "bun:sqlite";
import { afterEach, beforeEach, describe, expect, test } from "bun:test";
import { getTableColumns, getTableName, is } from "drizzle-orm";
import { SQLiteTable } from "drizzle-orm/sqlite-core";

import { migrate } from "./migrate";
import * as schema from "./schema";

const originalEnv = {
  SITU_HOME: process.env.SITU_HOME,
  SITU_DB_PATH: process.env.SITU_DB_PATH,
  SITU_REPO_PATH: process.env.SITU_REPO_PATH,
};

let tempRoot: string;
let dbPath: string;

describe("migrate", () => {
  beforeEach(async () => {
    tempRoot = await mkdtemp(join(tmpdir(), "situ-migrate-"));
    await mkdir(join(tempRoot, "situ", "sessions", "ses_migrate_test"), { recursive: true });
    dbPath = join(tempRoot, "situ", "sessions", "ses_migrate_test", "session.sqlite");
    process.env.SITU_HOME = join(tempRoot, "situ");
    process.env.SITU_DB_PATH = dbPath;
    process.env.SITU_REPO_PATH = tempRoot;
  });

  afterEach(async () => {
    restoreEnv();
    await rm(tempRoot, { recursive: true, force: true });
  });

  test("every drizzle enum value appears in the corresponding table CHECK clause", () => {
    migrate();
    const db = new Database(dbPath);
    try {
      const missing: string[] = [];
      for (const { tableName, columnName, values } of findDrizzleEnumColumns()) {
        const row = db
          .query("SELECT sql FROM sqlite_master WHERE type = 'table' AND name = ?")
          .get(tableName) as { sql?: string } | undefined;
        if (!row?.sql) {
          missing.push(`${tableName}: table not present in migrated db`);
          continue;
        }
        for (const value of values) {
          if (!row.sql.includes(`'${value}'`)) {
            missing.push(`${tableName}.${columnName}: SQL missing literal '${value}'`);
          }
        }
      }
      expect(missing).toEqual([]);
    } finally {
      db.close();
    }
  });

  test("fresh db accepts every blueprint role in claude_agents.kind", () => {
    migrate();
    const db = new Database(dbPath);
    try {
      for (const role of ["manager", "scientist", "verifier", "scribe", "reporter"]) {
        db.exec(
          `INSERT INTO claude_agents (id, kind, display_name) VALUES ('agent_${role}', '${role}', '${role}');`,
        );
      }
      const rows = db.query("SELECT kind FROM claude_agents ORDER BY kind").all() as {
        kind: string;
      }[];
      expect(rows.map((r) => r.kind)).toEqual([
        "manager",
        "reporter",
        "scientist",
        "scribe",
        "verifier",
      ]);
    } finally {
      db.close();
    }
  });
});

function findDrizzleEnumColumns(): {
  tableName: string;
  columnName: string;
  values: readonly string[];
}[] {
  const result: { tableName: string; columnName: string; values: readonly string[] }[] = [];
  for (const exportValue of Object.values(schema)) {
    if (!is(exportValue, SQLiteTable)) {
      continue;
    }
    const tableName = getTableName(exportValue);
    const columns = getTableColumns(exportValue);
    for (const column of Object.values(columns)) {
      const enumValues = (column as { enumValues?: unknown }).enumValues;
      if (Array.isArray(enumValues) && enumValues.length > 0) {
        result.push({
          tableName,
          columnName: column.name,
          values: enumValues as readonly string[],
        });
      }
    }
  }
  return result;
}

function restoreEnv(): void {
  for (const [key, value] of Object.entries(originalEnv)) {
    if (value === undefined) {
      delete process.env[key];
    } else {
      process.env[key] = value;
    }
  }
}
