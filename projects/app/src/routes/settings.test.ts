import { mkdir, mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterAll, beforeAll, beforeEach, describe, expect, test } from "bun:test";
import { eq } from "drizzle-orm";

import { ensureRuntimeContext } from "../config/session-context";
import { getDb } from "../data/db/client";
import { localSettings } from "../data/db/schema";
import { createApp } from "../server";

const originalEnv = {
  ANTHROPIC_BASE_URL: process.env.ANTHROPIC_BASE_URL,
  SITU_HOME: process.env.SITU_HOME,
  SITU_REPO_PATH: process.env.SITU_REPO_PATH,
  SITU_DB_PATH: process.env.SITU_DB_PATH,
  SITU_SECRETS_PATH: process.env.SITU_SECRETS_PATH,
  SITU_ANTHROPIC_KEY: process.env.SITU_ANTHROPIC_KEY,
};

let tempRoot: string;
let secretsPath: string;
let anthropicServer: ReturnType<typeof Bun.serve>;
let verificationRequests: { path: string; apiKey: string | null }[] = [];

describe("local settings routes", () => {
  beforeAll(async () => {
    tempRoot = await mkdtemp(join(tmpdir(), "situ-settings-"));
    const repoPath = join(tempRoot, "repo");
    const sessionHome = join(tempRoot, "situ", "sessions", "ses_settings");
    secretsPath = join(tempRoot, "situ", "secrets.json");
    await mkdir(repoPath, { recursive: true });
    await mkdir(sessionHome, { recursive: true });
    process.env.SITU_HOME = join(tempRoot, "situ");
    process.env.SITU_REPO_PATH = repoPath;
    process.env.SITU_DB_PATH = join(sessionHome, "session.sqlite");
    process.env.SITU_SECRETS_PATH = secretsPath;
    delete process.env.SITU_ANTHROPIC_KEY;
    anthropicServer = Bun.serve({
      port: 0,
      fetch: (request) => {
        const url = new URL(request.url);
        verificationRequests.push({
          path: url.pathname,
          apiKey: request.headers.get("x-api-key"),
        });
        if (
          request.method === "GET" &&
          url.pathname === "/v1/models" &&
          request.headers.get("x-api-key") === "sk-ant-test-settings"
        ) {
          return Response.json({
            data: [
              {
                id: "claude-test",
                type: "model",
                display_name: "Claude Test",
                created_at: "2026-01-01T00:00:00.000Z",
                capabilities: null,
                max_input_tokens: null,
                max_tokens: null,
              },
            ],
            has_more: false,
            first_id: "claude-test",
            last_id: "claude-test",
          });
        }
        return Response.json({ error: { message: "invalid api key" } }, { status: 401 });
      },
    });
    process.env.ANTHROPIC_BASE_URL = anthropicServer.url.origin;
    await ensureRuntimeContext({ sessionId: "ses_settings" });
  });

  beforeEach(async () => {
    resetTables();
    verificationRequests = [];
    await rm(secretsPath, { force: true });
  });

  afterAll(async () => {
    anthropicServer.stop(true);
    restoreEnv();
    await rm(tempRoot, { recursive: true, force: true });
  });

  test("rejects blank Anthropic keys", async () => {
    const app = createApp({ mode: { kind: "prod", webRoot: tempRoot } });

    const response = await app.request("/api/settings/anthropic-key", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ anthropicKey: "   " }),
    });

    expect(response.status).toBe(400);
    expect(await getDefaultLocalSettings()).toBeUndefined();
    expect(verificationRequests).toHaveLength(0);
  });

  test("rejects unverifiable Anthropic keys without storing them", async () => {
    const app = createApp({ mode: { kind: "prod", webRoot: tempRoot } });

    const response = await app.request("/api/settings/anthropic-key", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ anthropicKey: "sk-ant-bad-settings" }),
    });

    expect(response.status).toBe(400);
    const payload = jsonRecord(await response.json());
    expect(String(payload.error)).toContain("Anthropic API key verification failed");
    expect(JSON.stringify(payload)).not.toContain("sk-ant-bad-settings");
    expect(verificationRequests).toEqual([{ path: "/v1/models", apiKey: "sk-ant-bad-settings" }]);
    expect(await getDefaultLocalSettings()).toBeUndefined();
  });

  test("stores Anthropic key state and exposes localSettings through Replicache", async () => {
    const app = createApp({ mode: { kind: "prod", webRoot: tempRoot } });

    const response = await app.request("/api/settings/anthropic-key", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ anthropicKey: "sk-ant-test-settings" }),
    });

    expect(response.status).toBe(200);
    const payload = jsonRecord(await response.json());
    expect(JSON.stringify(payload)).not.toContain("sk-ant-test-settings");
    expect(payload.anthropicKeyConfigured).toBe(true);
    expect(jsonRecord(payload.localSettings).anthropicKeyConfigured).toBe(true);
    expect((await getDefaultLocalSettings())?.anthropicKeyConfigured).toBe(true);
    expect(verificationRequests).toEqual([{ path: "/v1/models", apiKey: "sk-ant-test-settings" }]);

    const pullResponse = await app.request("/api/replicache/pull", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ pullVersion: 1, cookie: 0 }),
    });

    expect(pullResponse.status).toBe(200);
    const pullPayload = jsonRecord(await pullResponse.json());
    const patch = patchOperations(pullPayload.patch);
    const localSettingsPut = putOperation({ patch, key: "localSettings/default" });
    expect(jsonRecord(localSettingsPut.value).anthropicKeyConfigured).toBe(true);
    expect(jsonRecord(putOperation({ patch, key: "status" }).value)).not.toHaveProperty(
      "anthropicKeyConfigured",
    );
  });
});

type PatchOperationValue = {
  op: string;
  key?: string;
  value?: unknown;
};

function resetTables(): void {
  getDb().delete(localSettings).run();
}

async function getDefaultLocalSettings(): Promise<typeof localSettings.$inferSelect | undefined> {
  return getDb().query.localSettings.findFirst({
    where: eq(localSettings.id, "default"),
  });
}

function restoreEnv(): void {
  setEnv("ANTHROPIC_BASE_URL", originalEnv.ANTHROPIC_BASE_URL);
  setEnv("SITU_HOME", originalEnv.SITU_HOME);
  setEnv("SITU_REPO_PATH", originalEnv.SITU_REPO_PATH);
  setEnv("SITU_DB_PATH", originalEnv.SITU_DB_PATH);
  setEnv("SITU_SECRETS_PATH", originalEnv.SITU_SECRETS_PATH);
  setEnv("SITU_ANTHROPIC_KEY", originalEnv.SITU_ANTHROPIC_KEY);
}

function setEnv(key: keyof typeof originalEnv, value: string | undefined): void {
  if (value === undefined) {
    delete process.env[key];
    return;
  }
  process.env[key] = value;
}

function patchOperations(value: unknown): PatchOperationValue[] {
  if (!Array.isArray(value)) {
    throw new Error("Expected Replicache patch array.");
  }
  return value.map((item) => jsonRecord(item) as PatchOperationValue);
}

function putOperation({
  patch,
  key,
}: {
  patch: PatchOperationValue[];
  key: string;
}): PatchOperationValue {
  const operation = patch.find((item) => item.op === "put" && item.key === key);
  if (!operation) {
    throw new Error(`Missing Replicache put operation for key: ${key}`);
  }
  return operation;
}

function jsonRecord(value: unknown): Record<string, unknown> {
  if (typeof value !== "object" || value === null || Array.isArray(value)) {
    throw new Error("Expected object value.");
  }
  return value as Record<string, unknown>;
}
