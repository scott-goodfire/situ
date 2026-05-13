import { expect, test } from "bun:test";

import { createServer } from "./server";

test("status route reports registered foundation modules", async () => {
  const response = await createServer().request("/api/status");
  const body = await response.json();

  expect(response.status).toBe(200);
  expect(body.ok).toBe(true);
  expect(body.modules).toContain("@situ/tasks");
});
