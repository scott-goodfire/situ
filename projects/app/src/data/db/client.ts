import { mkdirSync } from "node:fs";
import { dirname } from "node:path";
import { Database } from "bun:sqlite";
import { drizzle, type BunSQLiteDatabase } from "drizzle-orm/bun-sqlite";
import { sqlitePath } from "../../config/paths";
import { migrate } from "./migrate";
import * as schema from "./schema";

let sqlite: Database | undefined;
let db: BunSQLiteDatabase<typeof schema> | undefined;

export function getDb(): BunSQLiteDatabase<typeof schema> {
  if (db) {
    return db;
  }

  const path = sqlitePath();
  mkdirSync(dirname(path), { recursive: true });
  migrate();
  sqlite = new Database(path);
  sqlite.exec("PRAGMA journal_mode = WAL;");
  sqlite.exec("PRAGMA foreign_keys = ON;");
  db = drizzle(sqlite, { schema });
  return db;
}
