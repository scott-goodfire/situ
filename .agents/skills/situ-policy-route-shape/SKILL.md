---
name: situ-policy-route-shape
description: Use whenever adding, modifying, or reviewing HTTP routes under projects/app/src/routes — new endpoints, route file splits, or changes to the public API surface.
---

# Route Shape

One Hono router per area under `projects/app/src/routes/`, all mounted
at `/api` by `apiRoutes()`.

## Rules

- Each route file lives at `routes/<area>.ts` and exports a single
  `<area>Routes` Hono instance:

  ```ts
  // routes/status.ts
  export const statusRoutes = new Hono();
  statusRoutes.get("/status", async (c) => { ... });
  ```

- `routes/routes.ts` exports `apiRoutes(): Hono` and mounts every area
  router with `api.route("/", <area>Routes)`. New route files plug in
  here.
- Handlers read DB through `getDb()` and write through `runSyncedWrite`
  (see `situ-policy-mutations-via-runsyncedwrite`).
- Handlers parse request JSON with explicit types
  (`await c.req.json<RequestType>()`) and return `c.json(...)`.
- Handlers throw via `situ-policy-error-throwing`; the top-level Hono
  catch translates to status codes.
- Keep sibling handlers explicit when each route has distinct API
  behavior. Prefer tiny route-local helpers for repeated parsing,
  lookup, or enqueue plumbing over route factories that hide the public
  endpoint list.

## Avoid

- A handler defined directly on `apiRoutes()` instead of in its own
  `<area>Routes`.
- Two area routers exporting the same path (e.g., both register
  `/status`).
- A route file exports utilities next to the router — utilities belong
  in a sibling module or `modules/`.
- A handler reaches into `process.env`, raw `fs`, or other modules
  governed by their own policies (see `situ-policy-configuration-env-vars`,
  `situ-policy-filesystem-access`).

## See also

- `situ-policy-mutations-via-runsyncedwrite`
- `situ-policy-error-throwing`
- `situ-policy-barrel-exports`
