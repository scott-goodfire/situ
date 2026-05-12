# @situ/research-records

Durable research-record entities for situ. Owns the seven record tables —
hypotheses, experiments, baselines, evaluations, measurements, artifacts,
entity-links — plus the four activity tables that audit them. The package
exposes one repository per record type and aggregates them into a
`researchRecordsModule` namespace.

```ts
import { researchRecordsModule, hypothesisRepository } from "@situ/research-records";

researchRecordsModule.configure({ getDb, runSyncedWrite }); // once at boot

const hypothesis = await hypothesisRepository.create({
  title: "Reordering helps reasoning",
  summary: "Move the chain-of-thought block to after the question.",
});

await researchRecordsModule.experiments.accept({
  experimentId,
  comment: "Aligned with hypothesis; proceed.",
});
```

## What's here

- **Schema.** All 11 tables and `RESEARCH_RECORDS_TABLES_SQL` for the
  runtime migrator. Drizzle-level FKs are kept for _intra-package_
  references (experiments→hypotheses, evaluations→baselines/experiments,
  measurements→evaluations, \*\_activities→parent record). FKs to
  out-of-package tables (`research_tasks`, `claude_agents`,
  `research_projects`) are kept at the SQL level only.
- **Repositories** — one per record type:
  - `hypothesisRepository`, `experimentRepository`, `baselineRepository`,
    `evaluationRepository` use `createStatusRecordTransitions` for the
    `triage → accepted → active → in_review → done | canceled | failed`
    lifecycle.
  - `measurementRepository`, `artifactRepository`,
    `entityLinkRepository` are simpler — no status lifecycle.
- **`createStatusRecordTransitions`** lives in `src/__shared__/`. The
  package is its only consumer; the helper is no longer in the app's
  `repositories/__shared__/`.
- **`researchRecordsModule`** namespace exposes all 7 repositories under
  one object: `researchRecordsModule.hypotheses`, `.experiments`,
  `.baselines`, `.evaluations`, `.measurements`, `.artifacts`,
  `.entityLinks`. The barrel also exports each repository individually
  so existing import paths can collapse cleanly.

## What's NOT here

- **External cross-domain reads** — anything that joins research-records
  with research-tasks or research-projects belongs in the app (or in a
  future cross-cutting reader). The repositories here are
  CRUD-on-one-record-type primitives.
- **`PreconditionError` / `clampRepositoryLimit` / `matchesRepositorySearch`**
  — these still live in `projects/app/src/data/repositories/__shared__/`
  and are used by other app repositories. The package keeps its own
  duplicates inside `src/__shared__/` so it has zero static dependency
  on `@situ/app`.

## Status lifecycle

Status records share the enum
`triage | accepted | active | in_review | done | canceled | failed`,
exposed as `ResearchRecordStatus`. Transitions:

- `accept` — `triage → accepted`
- `submit` — `accepted/active → in_review`
- `complete` — any non-terminal → `done`
- `cancel` — any non-terminal → `canceled`
- `fail` — any non-terminal → `failed`
- `transition({ status })` — explicit, blocks transitions out of terminal
  statuses (`done`, `canceled`, `failed`).

## Testing

`bun --filter=@situ/research-records run test`. Repository contract
integration tests stay in the app under
`data/repositories/repository-contracts.test.ts`.
