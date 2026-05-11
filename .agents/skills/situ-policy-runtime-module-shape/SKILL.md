---
name: situ-policy-runtime-module-shape
description: Use whenever adding, modifying, or reviewing the parts of the system that drive work — schedulers, queues, dispatchers, sandboxes, or the headless automation loop under projects/app/src/runtime.
---

# Runtime Module Shape

`projects/app/src/runtime/` is the umbrella for **the parts of the system
that drive work** — as opposed to data (`data/`), API surface (`routes/`),
external clients (`claude/`), or app-wide modules (`modules/`).

```text
runtime/
├── automation/          # headless CLI run loop
├── compute/             # compute target allocation + leases
├── dispatch/            # ResearchTask / ResearchProject → work-item routing
│   ├── research-projects.ts
│   └── index.ts
├── scheduler/           # tick + heartbeat loop
├── shutdown.ts          # graceful shutdown coordination
├── work-items/          # the work queue (claim/complete/enqueue/fail/lease)
└── worktrees/           # git worktree allocation for experiments
```

## Why

Bundling the engine pieces under one umbrella makes the data/runtime
boundary obvious to a new contributor. Repositories own _what is_ (the
durable state); `runtime/` owns _what happens_ (scheduling, claiming,
dispatching, sandboxing). Mixing them — having `research-task-dispatch.ts`
and `repositories/research-tasks/` both at top level — buries the
distinction.

## Rules

- **Subfolders inside `runtime/`** each represent one engine concern:
  - `scheduler/` — tick loop + job registry
  - `work-items/` — durable queue runtime (claim, complete, enqueue, fail, lease)
  - `compute/` — compute target allocation, leases, heartbeats
  - `worktrees/` — git worktree provisioning for Scientist experiments
  - `dispatch/` — converts domain entities (ResearchTasks, ResearchProjects) into queued work items
  - `automation/` — the headless `situ exec` run loop
- **Sibling-relative imports stay short**: from `runtime/work-items/X.ts`
  to `runtime/compute/Y.ts` is `from "../compute"`. From any
  `runtime/<sub>/...` to non-runtime code is `from "../../<other>"`.
- **`runtime/dispatch/` houses entity-specific dispatchers** —
  `research-projects.ts` routes ResearchProjects and ResearchTasks to the
  right work-item purpose. New entity dispatchers go here, not in a sibling
  top-level folder.
- **Cross-runtime imports go through the entry barrel** of each
  subfolder (e.g. `from "../compute"` resolves to `compute/index.ts`).
- **External callers** (`cli/`, `routes/`, `claude/agents/`) reach into
  `runtime/` through entry barrels: `from "../runtime/dispatch"`,
  `from "../runtime/compute"`, etc. Never deep-import a single file
  from outside.

## Avoid

- A new top-level folder under `app/src/` for "engine" work — it
  belongs under `runtime/`.
- `runtime/<sub>/` lacking an `index.ts` barrel — see
  `situ-policy-barrel-exports`.
- Domain types or repositories landing inside `runtime/` — those
  belong in `data/`.
- Coupling the scheduler to a specific entity domain — the scheduler
  invokes named jobs; jobs live in `runtime/scheduler/jobs.ts` and
  delegate to `dispatch/`, `work-items/`, etc.

## See also

- `situ-policy-barrel-exports`
- `situ-policy-repository-module-shape`
- `situ-policy-route-shape`
- `situ-policy-mutations-via-runsyncedwrite`
