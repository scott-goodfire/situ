import { Database } from "bun:sqlite";
import { mkdirSync } from "node:fs";
import { dirname } from "node:path";
import { drizzle, type BunSQLiteDatabase } from "drizzle-orm/bun-sqlite";

import { installSchema } from "./install";
import { schema, type AppSchema } from "./schema";

export type AppDatabase = BunSQLiteDatabase<AppSchema> & {
  $client: Database;
};

export type CreateDatabaseOptions = {
  install?: boolean;
  readonly?: boolean;
  source?: string;
};

/**
 * Creates the app SQLite database.
 */
export const createDatabase = (input: CreateDatabaseOptions = {}): AppDatabase => {
  const source = input.source ?? process.env.SITU_DATABASE_PATH ?? ".situ/situ.sqlite";

  if (source !== ":memory:" && !(input.readonly ?? false)) {
    mkdirSync(dirname(source), { recursive: true });
  }

  const client = new Database(source, {
    readonly: input.readonly ?? false,
    create: !(input.readonly ?? false),
  });
  const db = drizzle(client, { schema });

  if (input.install ?? true) {
    installSchema({ db });
  }

  return db;
};

/**
 * Creates an in-memory app database.
 */
export const createInMemoryDatabase = (): AppDatabase =>
  createDatabase({
    source: ":memory:",
  });

export { installSchema, schema };
