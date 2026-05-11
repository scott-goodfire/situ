import { createHash, randomUUID } from "node:crypto";
import { mkdir, mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";

import {
  tinyAutoresearchSeed,
  writeTinyAutoresearchFixture,
  type TinyAutoresearchSeedName,
} from "@situ/evals-fixtures/tiny-autoresearch";

import { requireSuccessfulCommand, runCommand } from "./command";
import { seedTinyAutoresearchDb } from "./seed-db";

export type TinyAutoresearchWorld = Readonly<{
  rootPath: string;
  workspacePath: string;
  situHome: string;
  sessionHome: string;
  dbPath: string;
  sessionId: string;
  workspaceKey: string;
  appRoot: string;
  keep: boolean;
}>;

export type CreateTinyAutoresearchWorldResult = Readonly<{
  world: TinyAutoresearchWorld;
  cleanup: () => Promise<void>;
}>;

export async function createTinyAutoresearchWorld({
  seedName,
  sessionId = `ses_eval_${randomUUID().slice(0, 8)}`,
  keep = false,
}: {
  seedName?: TinyAutoresearchSeedName;
  sessionId?: string;
  keep?: boolean;
} = {}): Promise<CreateTinyAutoresearchWorldResult> {
  const rootPath = await mkdtemp(join(tmpdir(), "situ-eval-tiny-autoresearch-"));
  const workspacePath = join(rootPath, "repo");
  const situHome = join(rootPath, "situ");
  const sessionHome = join(situHome, "sessions", sessionId);
  const dbPath = join(sessionHome, "session.sqlite");
  const world: TinyAutoresearchWorld = {
    rootPath,
    workspacePath,
    situHome,
    sessionHome,
    dbPath,
    sessionId,
    workspaceKey: workspaceKeyForPath({ path: workspacePath }),
    appRoot: resolve(import.meta.dir, "../../../../../app"),
    keep,
  };

  await mkdir(sessionHome, { recursive: true });
  await writeTinyAutoresearchFixture({ rootPath: workspacePath });
  await initGitRepo({ world });
  await migrateWorldDb({ world });
  if (seedName) {
    seedTinyAutoresearchDb({
      world,
      seed: tinyAutoresearchSeed({ name: seedName }),
    });
  }

  return {
    world,
    cleanup: async () => {
      if (!world.keep) {
        await rm(world.rootPath, { recursive: true, force: true });
      }
    },
  };
}

export function tinyAutoresearchWorldEnv({
  world,
  env = {},
}: {
  world: TinyAutoresearchWorld;
  env?: Record<string, string | undefined>;
}): Record<string, string | undefined> {
  return {
    ...env,
    SITU_HOME: world.situHome,
    SITU_REPO_PATH: world.workspacePath,
    SITU_DB_PATH: world.dbPath,
    SITU_SESSION_ID: world.sessionId,
  };
}

async function migrateWorldDb({ world }: { world: TinyAutoresearchWorld }): Promise<void> {
  const result = await runCommand({
    cmd: ["bun", "run", "src/data/db/migrate.ts"],
    cwd: world.appRoot,
    env: tinyAutoresearchWorldEnv({ world }),
    timeoutMs: 60_000,
  });
  requireSuccessfulCommand({ result });
}

async function initGitRepo({ world }: { world: TinyAutoresearchWorld }): Promise<void> {
  for (const cmd of [
    ["git", "init"],
    ["git", "add", "."],
    [
      "git",
      "-c",
      "user.name=situ Eval",
      "-c",
      "user.email=situ@example.test",
      "commit",
      "-m",
      "initial fixture",
    ],
  ]) {
    const result = await runCommand({
      cmd,
      cwd: world.workspacePath,
      timeoutMs: 30_000,
    });
    requireSuccessfulCommand({ result });
  }
}

function workspaceKeyForPath({ path }: { path: string }): string {
  return createHash("sha256").update(path).digest("hex").slice(0, 16);
}
