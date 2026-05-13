import { expect, test } from "bun:test";

import { createInMemoryDatabase } from "./db";
import { createServer } from "./server";

test("status route reports registered foundation modules", async () => {
  const response = await createServer({ db: createInMemoryDatabase() }).request("/api/status");
  const body = await response.json();

  expect(response.status).toBe(200);
  expect(body.ok).toBe(true);
  expect(body.modules).toContain("@situ/tasks");
  expect(body.modules).toContain("@situ/experiments");
});

test("replicache push writes through app actions and pull returns records", async () => {
  const db = createInMemoryDatabase();
  const app = createServer({ db });
  const pushResponse = await app.request("/api/replicache/push", {
    body: JSON.stringify({
      clientID: "client_1",
      mutations: [
        {
          id: 1,
          name: "project/create",
          args: {
            id: "project_1",
            goalMarkdown: "Find a better local search strategy.",
          },
        },
        {
          id: 2,
          name: "agent/create",
          args: {
            id: "scientist_1",
            instructionsMarkdown: "Develop candidate experiments.",
            name: "Scientist",
            role: "scientist",
          },
        },
        {
          id: 3,
          name: "task/create",
          args: {
            assignee: {
              actorKind: "agent",
              actorId: "scientist_1",
            },
            bodyMarkdown: "Try one candidate branch.",
            id: "task_1",
            projectId: "project_1",
            title: "Run experiment",
            type: "implementation",
          },
        },
      ],
    }),
    headers: {
      "content-type": "application/json",
    },
    method: "POST",
  });
  const pushBody = await pushResponse.json();

  expect(pushResponse.status).toBe(200);
  expect(pushBody.mutationResults.every((result: { ok: boolean }) => result.ok)).toBe(true);

  const pullResponse = await app.request("/api/replicache/pull", {
    body: JSON.stringify({}),
    headers: {
      "content-type": "application/json",
    },
    method: "POST",
  });
  const pullBody = await pullResponse.json();

  expect(pullResponse.status).toBe(200);
  expect(pullBody.lastMutationIDChanges.client_1).toBe(3);
  expect(pullBody.patch.map((operation: { key: string }) => operation.key)).toEqual(
    expect.arrayContaining(["projects/project_1", "tasks/task_1"]),
  );

  await Bun.sleep(2);

  await app.request("/api/replicache/push", {
    body: JSON.stringify({
      clientID: "client_1",
      mutations: [
        {
          id: 4,
          name: "task/create",
          args: {
            bodyMarkdown: "Try a second candidate branch.",
            id: "task_2",
            projectId: "project_1",
            title: "Run second experiment",
            type: "implementation",
          },
        },
      ],
    }),
    headers: {
      "content-type": "application/json",
    },
    method: "POST",
  });

  const deltaResponse = await app.request("/api/replicache/pull", {
    body: JSON.stringify({
      cookie: pullBody.cookie,
    }),
    headers: {
      "content-type": "application/json",
    },
    method: "POST",
  });
  const deltaBody = await deltaResponse.json();
  const deltaKeys = deltaBody.patch.map((operation: { key: string }) => operation.key);

  expect(deltaBody.lastMutationIDChanges.client_1).toBe(4);
  expect(deltaKeys).toContain("tasks/task_2");
  expect(deltaKeys).not.toContain("projects/project_1");
});
