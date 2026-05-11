import { mkdir, mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterAll, beforeAll, beforeEach, describe, expect, test } from "bun:test";

import { ensureRuntimeContext, resetRuntimeContextForTests } from "../../../config/session-context";
import { getDb, resetDbForTests } from "../../../data/db/client";
import { session as sessionTable } from "../../../data/db/schema";
import { headlessManagerBlueprint, managerBlueprint } from "../roles/manager/blueprint";
import { reporterBlueprint } from "../roles/reporter/blueprint";
import { scientistBlueprint } from "../roles/scientist/blueprint";
import { scribeBlueprint } from "../roles/scribe/blueprint";
import { verifierBlueprint } from "../roles/verifier/blueprint";
import {
  MEMORY_STORE_INSTRUCTIONS,
  buildSessionResources,
  ensureClaudeMemoryStore,
} from "./claude-memory-store";
import type { ManagedAgentsBeta } from "./types";

type FakeBeta = {
  client: ManagedAgentsBeta;
  createdMemoryStores: { id: string; name: string; description: string }[];
};

function fakeBeta(): FakeBeta {
  const createdMemoryStores: FakeBeta["createdMemoryStores"] = [];
  let nextId = 1;
  const client = {
    memoryStores: {
      create: async ({ name, description }: { name: string; description: string }) => {
        const id = `memstore_${nextId++}`;
        createdMemoryStores.push({ id, name, description });
        return { id, name, description };
      },
    },
  } as unknown as ManagedAgentsBeta;
  return { client, createdMemoryStores };
}

const originalEnv = {
  SITU_HOME: process.env.SITU_HOME,
  SITU_REPO_PATH: process.env.SITU_REPO_PATH,
  SITU_DB_PATH: process.env.SITU_DB_PATH,
};

let tempRoot: string;

describe("claude memory store wiring", () => {
  beforeAll(async () => {
    resetDbForTests();
    resetRuntimeContextForTests();
    tempRoot = await mkdtemp(join(tmpdir(), "situ-memory-store-"));
    const repoPath = join(tempRoot, "repo");
    const sessionHome = join(tempRoot, "situ", "sessions", "ses_memory_test");
    await mkdir(repoPath, { recursive: true });
    await mkdir(sessionHome, { recursive: true });
    process.env.SITU_HOME = join(tempRoot, "situ");
    process.env.SITU_REPO_PATH = repoPath;
    process.env.SITU_DB_PATH = join(sessionHome, "session.sqlite");
    await ensureRuntimeContext({ sessionId: "ses_memory_test" });
  });

  beforeEach(() => {
    getDb().delete(sessionTable).run();
  });

  afterAll(async () => {
    resetDbForTests();
    resetRuntimeContextForTests();
    restoreEnv();
    await rm(tempRoot, { recursive: true, force: true });
  });

  test("ensureClaudeMemoryStore creates a store on first call and persists the id", async () => {
    const beta = fakeBeta();
    const { claudeMemoryStoreId } = await ensureClaudeMemoryStore({ beta: beta.client });
    expect(claudeMemoryStoreId).toBe("memstore_1");
    expect(beta.createdMemoryStores).toHaveLength(1);
    expect(beta.createdMemoryStores[0]?.name).toBe("situ session ses_memory_test");
    const row = await getDb().query.session.findFirst();
    expect(row?.claudeMemoryStoreId).toBe("memstore_1");
  });

  test("ensureClaudeMemoryStore reuses the persisted id and does not create a second store", async () => {
    const beta = fakeBeta();
    const first = await ensureClaudeMemoryStore({ beta: beta.client });
    const second = await ensureClaudeMemoryStore({ beta: beta.client });
    expect(first.claudeMemoryStoreId).toBe(second.claudeMemoryStoreId);
    expect(beta.createdMemoryStores).toHaveLength(1);
  });

  test("buildSessionResources attaches memory_store for the interactive Manager", async () => {
    const beta = fakeBeta();
    const resources = await buildSessionResources({
      blueprint: managerBlueprint,
      beta: beta.client,
    });
    expect(resources).toHaveLength(1);
    expect(resources?.[0]).toEqual({
      type: "memory_store",
      memory_store_id: "memstore_1",
      access: "read_write",
      instructions: MEMORY_STORE_INSTRUCTIONS,
    });
  });

  test("buildSessionResources also attaches memory_store for the headless Manager", async () => {
    const beta = fakeBeta();
    const resources = await buildSessionResources({
      blueprint: headlessManagerBlueprint,
      beta: beta.client,
    });
    expect(resources?.[0]?.type).toBe("memory_store");
    expect(beta.createdMemoryStores).toHaveLength(1);
  });

  test("buildSessionResources never attaches memory_store for non-Manager roles", async () => {
    const beta = fakeBeta();
    for (const blueprint of [
      scientistBlueprint,
      verifierBlueprint,
      scribeBlueprint,
      reporterBlueprint,
    ]) {
      const resources = await buildSessionResources({ blueprint, beta: beta.client });
      expect(resources).toBeUndefined();
    }
    expect(beta.createdMemoryStores).toHaveLength(0);
  });
});

function restoreEnv(): void {
  for (const [key, value] of Object.entries(originalEnv)) {
    if (value === undefined) {
      delete process.env[key];
    } else {
      process.env[key] = value;
    }
  }
}
