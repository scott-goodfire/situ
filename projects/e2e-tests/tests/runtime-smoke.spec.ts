import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { jsonModule } from "./modules/json";
import {
  type BootstrapResponse,
  type LocalSettingsResponse,
  type StatusResponse,
  expect,
  getJson,
  patchValue,
  postJson,
  pullReplicache,
  runAppCliJson,
  test,
} from "./fixtures";

test("app boots with isolated session state", async ({ stack }) => {
  const bootstrap = await getJson<BootstrapResponse>({
    url: stack.url,
    path: "/api/bootstrap",
  });
  const status = await getJson<StatusResponse>({
    url: stack.url,
    path: "/api/status",
  });

  expect(bootstrap.sessionId).toMatch(/^ses_/);
  expect(bootstrap.replicacheName).toBe(`situ-session-${bootstrap.sessionId}`);
  expect(bootstrap.repoPath).toBe(stack.workspace);
  expect(bootstrap.session.id).toBe(bootstrap.sessionId);
  expect(status.session).toBeTruthy();

  const firstPull = await pullReplicache({ url: stack.url, cookie: 0 });
  expect(
    patchValue<LocalSettingsResponse>(firstPull, "localSettings/default")?.anthropicKeyConfigured,
  ).toBe(false);

  const sessionHome = join(stack.home, "sessions", bootstrap.sessionId);
  expect(existsSync(join(sessionHome, "metadata.json"))).toBe(true);
  expect(existsSync(join(sessionHome, "session.sqlite"))).toBe(true);

  const metadata = jsonModule.parse<{
    repoPath?: string;
    sessionId?: string;
  }>({ text: readFileSync(join(sessionHome, "metadata.json"), "utf8") });
  expect(metadata.sessionId).toBe(bootstrap.sessionId);
  expect(metadata.repoPath).toBe(stack.workspace);
});

test("settings and Replicache pulls are durable and incremental", async ({ stack }) => {
  await postJson({
    url: stack.url,
    path: "/api/settings/anthropic-key",
    body: { anthropicKey: "sk-ant-e2e-fake" },
  });
  const firstPull = await pullReplicache({ url: stack.url, cookie: 0 });
  expect(firstPull.cookie).toBeGreaterThan(0);
  expect(
    patchValue<LocalSettingsResponse>(firstPull, "localSettings/default")?.anthropicKeyConfigured,
  ).toBe(true);
  expect(patchValue<StatusResponse>(firstPull, "status")).not.toHaveProperty(
    "anthropicKeyConfigured",
  );
  expect(firstPull.patch.some((operation) => operation.op === "clear")).toBe(true);

  const stablePull = await pullReplicache({
    url: stack.url,
    cookie: firstPull.cookie,
  });
  expect(stablePull.cookie).toBe(firstPull.cookie);
  expect(stablePull.patch).toEqual([]);
});

test("compute CLI manages targets in isolated session state", async ({ stack }) => {
  const bootstrap = await getJson<BootstrapResponse>({
    url: stack.url,
    path: "/api/bootstrap",
  });

  const added = runAppCliJson<{
    computeTarget: { id: string; pool: string; status: string; metadataJson: string };
  }>({
    args: [
      "compute",
      "add",
      "--session",
      bootstrap.sessionId,
      "--id",
      "e2e-target",
      "--pool",
      "gpu",
      "--label",
      "E2E GPU",
      "--cuda-visible-devices",
      "0",
      "--json",
    ],
    env: stack.env,
  });
  expect(added.computeTarget).toEqual(
    expect.objectContaining({
      id: "e2e-target",
      pool: "gpu",
      status: "idle",
    }),
  );
  expect(jsonModule.parse({ text: added.computeTarget.metadataJson })).toEqual({
    cuda_visible_devices: "0",
  });

  const listed = runAppCliJson<{
    computeTargets: { id: string; pool: string; status: string }[];
  }>({
    args: ["compute", "list", "--session", bootstrap.sessionId, "--pool", "gpu", "--json"],
    env: stack.env,
  });
  expect(listed.computeTargets).toContainEqual(
    expect.objectContaining({
      id: "e2e-target",
      pool: "gpu",
      status: "idle",
    }),
  );

  const drained = runAppCliJson<{ computeTarget: { status: string } }>({
    args: ["compute", "drain", "e2e-target", "--session", bootstrap.sessionId, "--json"],
    env: stack.env,
  });
  expect(drained.computeTarget.status).toBe("draining");

  const restored = runAppCliJson<{ computeTarget: { status: string } }>({
    args: ["compute", "restore", "e2e-target", "--session", bootstrap.sessionId, "--json"],
    env: stack.env,
  });
  expect(restored.computeTarget.status).toBe("idle");

  const removed = runAppCliJson<{ computeTarget: { status: string } }>({
    args: ["compute", "remove", "e2e-target", "--session", bootstrap.sessionId, "--json"],
    env: stack.env,
  });
  expect(removed.computeTarget.status).toBe("dead");
});
