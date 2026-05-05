type BetterSqliteDatabase = {
  close: () => void;
  exec: (sql: string) => unknown;
  prepare: (sql: string) => {
    all: (...params: unknown[]) => unknown[];
    get: (...params: unknown[]) => unknown;
    run: (...params: unknown[]) => unknown;
  };
};

type BunSqliteDatabase = {
  close: () => void;
  exec: (sql: string) => unknown;
  query: (sql: string) => {
    all: (...params: unknown[]) => unknown[];
    get: (...params: unknown[]) => unknown;
    run: (...params: unknown[]) => unknown;
  };
};

export type SqliteDatabase = {
  all: (sql: string, params?: unknown[]) => unknown[];
  close: () => void;
  exec: (sql: string) => void;
  get: (sql: string, params?: unknown[]) => unknown;
  run: (sql: string, params?: unknown[]) => void;
};

export async function openSqliteDatabase({
  path,
  readonly,
  fileMustExist,
}: {
  path: string;
  readonly?: boolean;
  fileMustExist?: boolean;
}): Promise<SqliteDatabase> {
  if (isBunRuntime()) {
    return openBunSqliteDatabase({ path, readonly });
  }

  return openBetterSqliteDatabase({ path, readonly, fileMustExist });
}

async function openBetterSqliteDatabase({
  path,
  readonly = false,
  fileMustExist = false,
}: {
  path: string;
  readonly?: boolean;
  fileMustExist?: boolean;
}): Promise<SqliteDatabase> {
  const betterSqliteModule = "better-sqlite3";
  const { default: Database } = await import(betterSqliteModule);
  const database = new Database(path, {
    fileMustExist,
    readonly,
  }) as BetterSqliteDatabase;

  return {
    all: (sql, params = []) => database.prepare(sql).all(...params),
    close: () => database.close(),
    exec: (sql) => {
      database.exec(sql);
    },
    get: (sql, params = []) => database.prepare(sql).get(...params),
    run: (sql, params = []) => {
      database.prepare(sql).run(...params);
    },
  };
}

async function openBunSqliteDatabase({
  path,
  readonly = false,
}: {
  path: string;
  readonly?: boolean;
}): Promise<SqliteDatabase> {
  const bunSqliteModule = "bun:sqlite";
  const { Database } = await import(bunSqliteModule);
  const options = readonly ? { readonly: true } : undefined;
  const database = new Database(path, options) as BunSqliteDatabase;

  return {
    all: (sql, params = []) => database.query(sql).all(...params),
    close: () => database.close(),
    exec: (sql) => {
      database.exec(sql);
    },
    get: (sql, params = []) => database.query(sql).get(...params),
    run: (sql, params = []) => {
      database.query(sql).run(...params);
    },
  };
}

function isBunRuntime(): boolean {
  return "Bun" in globalThis;
}
