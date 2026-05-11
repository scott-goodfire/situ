import { Hono } from "hono";
import type { PullRequest, PullResponseOKV1 } from "replicache";
import { createReplicachePokeResponse } from "./replicache-poke";
import { buildReplicachePatch } from "./replicache-pull";

export const replicacheRoutes = new Hono();

replicacheRoutes.get("/replicache/poke", (c) => {
  return createReplicachePokeResponse({ signal: c.req.raw.signal });
});

replicacheRoutes.post("/replicache/pull", async (c) => {
  const request = await c.req.json<PullRequest>();
  if (request.pullVersion !== 1) {
    return c.json({ error: "VersionNotSupported", versionType: "pull" });
  }

  const readModel = await buildReplicachePatch({ cookie: request.cookie });
  const response: PullResponseOKV1 = {
    cookie: readModel.cookie,
    lastMutationIDChanges: {},
    patch: readModel.patch,
  };
  return c.json(response);
});
