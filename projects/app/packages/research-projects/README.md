# @situ/research-projects

Orchestration cluster for situ's research loop. Owns the four "driver"
tables — research_projects, research_project_interactions, research_tasks,
research_task_verifications — that the Manager/Scientist/Verifier agents
read and write to plan, run, and verify a research session.

```ts
import { researchProjectsModule, researchProjectRepository } from "@situ/research-projects";

researchProjectsModule.configure({ getDb, runSyncedWrite }); // once at boot

const project = await researchProjectRepository.create({ goal });
await researchProjectsModule.tasks.create({
  researchProjectId: project.id,
  type: "explore",
  title: "Reproduce baseline",
  workerPrompt: "…",
  verificationPrompt: "…",
});
```

## What's here

- **Schema.** All 4 tables and `RESEARCH_PROJECTS_TABLES_SQL` for the
  runtime migrator. Intra-package FKs (research_tasks → research_projects,
  research_tasks self-FK, research_task_verifications → research_tasks,
  research_project_interactions → research_projects) are kept at the
  drizzle level. External FKs to `claude_agents` are SQL-only.
- **Repositories** — one per record type. Status/phase enums and the
  related transition assertions live alongside each repository:
  - `researchProjectRepository` — create, transition (status), updatePhase
  - `researchTaskRepository` — create, transition, claimPlanned
  - `researchTaskVerificationRepository` — create (auto-transitions the
    parent ResearchTask via `researchTaskRepository.transition`)
  - `researchProjectInteractionRepository` — create (sets project to
    `blocked_on_user`), transition (returns project to `active`)
- **`researchProjectsModule`** namespace exposes all four repositories:
  `.projects`, `.tasks`, `.verifications`, `.interactions`. The barrel
  also exports each repository individually, plus `researchProjectExecutionMode`
  / `researchProjectIsHeadless` helpers.

## What's NOT here

- **Cross-domain orchestration** — anything that joins these records with
  research-records (hypotheses/experiments/etc.), work-items, or
  Claude agent runs lives in the app. The repositories here are
  CRUD-on-one-record-type primitives.
- **Repository contracts test** — stays in the app at
  `data/repositories/repository-contracts.test.ts`.

## Status lifecycles

- **ResearchProject:** `active → blocked_on_user → active` (through
  interactions); transitions out via `complete | failed | canceled`. Phase
  separately tracks the loop stage: `onboarding → baseline → search →
reporting → complete`.
- **ResearchTask:** `planned → running → awaiting_verification → verified |
rejected | pruned | failed | canceled`. `recover-expired-leases` may
  return tasks to `planned`.
- **ResearchTaskVerification:** terminal records (no transitions). Their
  status drives the parent ResearchTask: `passed → verified`,
  `needs_more_evidence → planned`, anything else → `rejected`.
- **ResearchProjectInteraction:** `pending → answered | confirmed |
rejected | canceled`.

## Testing

`bun --filter=@situ/research-projects run test`. Repository contract
integration tests stay in the app under
`data/repositories/repository-contracts.test.ts`.
