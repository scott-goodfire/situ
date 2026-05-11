import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterAll, beforeAll, describe, expect, test } from "bun:test";

import { ensureRuntimeContext } from "../../../config/session-context";
import { recordAppEvent } from "../../../app-events/record-app-event";
import { appEventRepository } from "./app-event-repository";

let tempRoot: string;

describe("app event repository", () => {
  beforeAll(async () => {
    tempRoot = await mkdtemp(join(tmpdir(), "situ-app-events-"));
    process.env.SITU_HOME = join(tempRoot, "situ");
    process.env.SITU_REPO_PATH = tempRoot;
    process.env.SITU_DB_PATH = join(tempRoot, "situ", "sessions", "test", "session.sqlite");
    await ensureRuntimeContext({ sessionId: "test" });
  });

  afterAll(async () => {
    await rm(tempRoot, { recursive: true, force: true });
  });

  test("require throws PreconditionError when the id is missing", async () => {
    await expect(appEventRepository.require({ appEventId: 999_999 })).rejects.toMatchObject({
      code: "app_event_not_found",
    });
    expect(await appEventRepository.get({ appEventId: 999_999 })).toBe(undefined);
  });

  test("list returns the most recent events and clamps the limit", async () => {
    await recordAppEvent({ type: "app_event_test.alpha", message: "alpha event" });
    await new Promise((resolveTimeout) => setTimeout(resolveTimeout, 5));
    await recordAppEvent({ type: "app_event_test.beta", message: "beta event" });
    await new Promise((resolveTimeout) => setTimeout(resolveTimeout, 5));
    await recordAppEvent({ type: "app_event_test.gamma", message: "gamma event" });

    const recent = await appEventRepository.list({ limit: 2 });
    expect(recent).toHaveLength(2);
    expect(recent[0]?.type).toBe("app_event_test.gamma");
    expect(recent[1]?.type).toBe("app_event_test.beta");

    const clamped = await appEventRepository.list({ limit: 5000 });
    expect(clamped.length).toBeLessThanOrEqual(50);
  });

  test("search filters by exact type", async () => {
    await recordAppEvent({ type: "app_event_test.filtered", message: "matches filter" });
    await recordAppEvent({ type: "app_event_test.other", message: "should not match filter" });

    const matched = await appEventRepository.search({ type: "app_event_test.filtered" });
    expect(matched.length).toBeGreaterThan(0);
    for (const event of matched) {
      expect(event.type).toBe("app_event_test.filtered");
    }
  });

  test("recordAppEvent stores createdAt as an ISO-8601 timestamp", async () => {
    await recordAppEvent({ type: "app_event_test.iso_format", message: "iso check" });
    const rows = await appEventRepository.search({ type: "app_event_test.iso_format" });
    const firstRow = rows[0];
    if (!firstRow) {
      throw new Error("Expected at least one app event row.");
    }
    expect(firstRow.createdAt).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/);
    expect(firstRow.createdAt.endsWith("Z")).toBe(true);
  });

  test("search filters out rows created before the since cutoff", async () => {
    await recordAppEvent({ type: "app_event_test.before", message: "older row" });
    await new Promise((resolveTimeout) => setTimeout(resolveTimeout, 1100));
    await recordAppEvent({ type: "app_event_test.after", message: "newer row" });

    const afterRow = (await appEventRepository.search({ type: "app_event_test.after" }))[0];
    if (!afterRow) {
      throw new Error("Expected after row to be defined.");
    }
    const cutoff = afterRow.createdAt;

    const newer = await appEventRepository.search({ since: cutoff });
    const types = newer.map((event) => event.type);
    expect(types).toContain("app_event_test.after");
    expect(types).not.toContain("app_event_test.before");
  });
});
