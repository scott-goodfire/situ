---
name: situ-policy-research-projects-package
description: Use whenever modifying code under projects/app/packages/research-projects, wiring @situ/research-projects, or touching research_projects / research_tasks / research_task_verifications repositories at the package boundary.
---

# `@situ/research-projects` Package Shape

Orchestration cluster for situ's research loop. Owns the four "driver"
tables — research_projects, research_project_interactions, research_tasks,
research_task_verifications — that the Manager/Scientist/Verifier agents
read and write to plan, run, and verify a research session.

```text
projects/app/packages/research-projects/
├── package.json                       # @situ/research-projects, single barrel
├── tsconfig.json
├── README.md
└── src/
    ├── index.ts                       # public barrel
    ├── module.ts                      # researchProjectsModule namespace
    ├── schema.ts                      # 4 tables + RESEARCH_PROJECTS_TABLES_SQL
    ├── types.ts                       # ResearchProjectRecord, …, context types
    ├── context.ts                     # configureResearchProjects / getResearchProjectsContext
    ├── __shared__/                    # PreconditionError, nowIso, parseRecord, requiredText, …
    └── repositories/
        ├── research-projects/         # researchProjectRepository + execution-mode helpers
        ├── research-tasks/            # researchTaskRepository + status/type/priority enums
        ├── research-task-verifications/
        └── research-project-interactions/
```

## Rules

- **Cluster shape (4 repositories).** Same pattern as `@situ/research-records`:
  the barrel exports each repository individually AND aggregates them as
  `researchProjectsModule.{projects, tasks, verifications, interactions}`.
- **Single barrel.** Consumers import from `@situ/research-projects`. No
  sub-path exports.
- **Module-level DI.** `configureResearchProjects({ getDb, runSyncedWrite })`
  wired from `data/db/configure-research-projects-package.ts` via dynamic
  import in `ensureRuntimeContext`. No `recordAppEvent` callback — these
  repositories don't write to `app_events`.
- **Internal FKs are drizzle-typed.** research_tasks → research_projects,
  research_tasks self-FK, research_task_verifications → research_tasks,
  research_project_interactions → research_projects. External FKs to
  `claude_agents` are SQL-only; the drizzle `.references()` is dropped.
- **Workspace re-exports.** `data/db/schema.ts` does
  `import { researchProjects, researchTasks, … } from "@situ/research-projects"; export { … };`
  so app schemas (feedEntries, etc.) that have drizzle FK references to
  these tables can resolve them in scope.
- **Cross-package transactions stay in app-side wrappers.** The two app
  repositories that touch this cluster's tables in the same transaction
  (baselines' `createOrUpdateProjectBaseline`, the
  research_project_interactions update inside the package's
  `interactions.create`/`transition`) live in their respective owners. The
  package's own intra-cluster cross-references — for instance,
  `interactions.create` updating `researchProjects.status` to
  `blocked_on_user`, or `verifications.create` calling
  `researchTaskRepository.transition` — are intra-package and stay here.
- **Status/phase enums + transition assertions live alongside their
  repository.** Each repository file owns the enums and assertion helpers
  for its own record type. They're not lifted into a shared status helper
  because each record's lifecycle is different (project status vs phase
  vs task status vs interaction status vs verification status).
- **Constants are imported from `@situ/protocol`** for ResearchTask types,
  statuses, priorities, and verification profiles/statuses. The package
  declares `@situ/protocol` as a dependency.

## App-side composition

Cross-cluster work that joins these records with research-records,
work-items, compute, or worktrees lives in the app — typically under
`runtime/dispatch/`, `runtime/automation/`, or
`runtime/lease-recovery/`. The repositories here are CRUD primitives.

## Avoid

- Importing from inside the package's `__shared__/` or sub-package
  folders. Use the barrel: `import { researchTaskRepository } from "@situ/research-projects"`.
- Adding sub-path exports (`@situ/research-projects/tasks`).
- Importing `@situ/app` symbols from inside the package — even
  transitively.
- Adding new cross-package transactions to package repositories. If a
  write needs to touch tables outside this cluster, add a thin app-side
  wrapper alongside `data/repositories/baselines/create-or-update-project-baseline.ts`.

## See also

- `situ-policy-research-records-package`
- `situ-policy-compute-package`
- `situ-policy-work-items-package`
- `situ-extract-app-package`
