# @situ/web

Vite + React runtime web app. Mounts the workspace UI on top of replicache.

## Run

```bash
mise run app   # @situ/app at http://127.0.0.1:4317
mise run web   # this app at http://127.0.0.1:5173
```

`vite.config.ts` proxies `/api` to `SITU_APP_URL` (default
`http://127.0.0.1:4317`). Override the default by exporting `SITU_APP_URL`
before `mise run web`.

## Layout

```text
src/
├── main.tsx                  createRoot mount
├── app/
│   ├── replicache.tsx        Replicache instance + Provider + useReplicache
│   │                           + EventSource('/api/replicache/poke') → rep.pull
│   ├── situ-app.tsx          ReplicacheProvider + RouterProvider + DxToaster
│   ├── app-shell/            DxAppFrame + DxSidebar + topBar (theme toggle)
│   └── router.tsx            TanStack Router code-based route tree
├── selectors/
│   ├── entity.ts             useEntityList<T>, useEntity<T> generic helpers
│   └── <entity>.ts           one-line wrappers around the generics
└── pages/<entity>-<list|detail>-page/
    ├── index.ts
    └── <name>.tsx            thin <view value={selector()} /> bridge
```

## Data flow

The server (`@situ/app`) emits every research entity into the replicache
keyspace via `POST /api/replicache/pull`. Live updates arrive over an SSE
stream at `GET /api/replicache/poke`.

```text
@situ/app  ──pull/poke──▶  Replicache (browser)  ──useSubscribe──▶  selectors  ──props──▶  views (@situ/web-app-ui)
```

Selectors call `useEntityList(prefix)` / `useEntity(prefix, id)` against the
replicache keyspace. Pages are tiny: they call selectors and pass the result
into a presentational view from `@situ/web-app-ui`.

## Adding a new entity view

1. **Type** — add the record type to `@situ/protocol/src/records.ts` and re-export from `index.ts`.
2. **View** — create `@situ/web-app-ui/src/pages/<name>-list-view/{index, *.tsx, *.stories.tsx}` (and detail if applicable). Add fixtures under `src/fixtures/<name>.ts`. Export from the package `index.ts`.
3. **Selector** — `src/selectors/<name>.ts` — a one-line wrapper around `useEntityList<T>("<keyspacePrefix>/")`.
4. **Page** — `src/pages/<name>-list-page/{index, *.tsx}` — `<XxxListView entries={useXxx()} />`.
5. **Route** — add a `createRoute` block in `src/app/router.tsx` and append to the `routeTree.addChildren([...])` list.
6. **(Optional) Sidebar** — add a `<NavItem>` in `src/app/app-shell/app-shell.tsx`. Skip if the route should be reachable by URL only.

## Theme

Theme persistence + system-pref tracking lives in `useDxTheme()`
(`@situ/web-ui`), wired from `AppShell`. The `<head>` of `index.html` runs an
inline pre-paint script that reads `localStorage["dx-theme"]` and sets
`data-theme` on `<html>` before React mounts — preventing FOUC.

## Conventions

- Components and pages live in their own folders (`<name>/<name>.tsx` + `index.ts`).
- Selectors are flat hooks (utilities, not components).
- View components are pure presentation; runtime pages do all data fetching.
- Replicache values may include internal fields (`syncVersion`, etc.) the
  selectors cast away — keep `@situ/protocol` types as the contract the UI
  consumes.
