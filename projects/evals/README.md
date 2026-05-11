# Situ Evals

Situ uses tests for non-LLM mechanics and evals for LLM-backed agent behavior.

## Tests

Run:

```bash
mise run test
```

The evals package contributes tests for prompt markers, runtime skill markers,
fixture shape, and fixture-backed durable state behavior.

## Live Agent Evals

Run:

```bash
SITU_ANTHROPIC_KEY=sk-ant-... mise run evals
```

Live agent evals intentionally hit real Claude Managed Agents and therefore
require `SITU_ANTHROPIC_KEY`. They run against an isolated temporary
`SITU_HOME`, fixture repository, and SQLite database. They do not read a saved
local UI key from the developer machine.

Live agent evals should stay bounded. The tiny autoresearch live eval defaults
to 60 minutes because it exercises a Scientist task and Verifier pass.

List available live cases:

```bash
mise run evals -- --list
```

Run a specific case:

```bash
SITU_ANTHROPIC_KEY=sk-ant-... mise run evals -- --case manager_onboarding_baseline
```

Run the whole live suite:

```bash
SITU_ANTHROPIC_KEY=sk-ant-... mise run evals -- --case all
```

The current tiny autoresearch live cases cover baseline discovery, abbreviated
id recovery, Manager onboarding, post-confirmation ResearchTask planning,
candidate experiment execution, adversarial verification, explore/exploit
choice, global-optimum traps, plateau backtracking, debug-child recovery,
reward-hacking guards, parallel move bundles, mid-run hypothesis generation,
missing-metric checkpoints, large-context compression, verifier-contract
quality, and synthesis/report lineage.

Live agent evals should assert on durable Situ state: ResearchProjects,
ResearchProjectInteractions, ResearchTasks, ResearchTaskVerifications, work
items, Claude runs, hypotheses, baselines, experiments, evaluations,
measurements, artifacts, entity links, and typed activities. Candidate and
lineage cases should assert primary `associatedHypothesisId` and
`parentExperimentId` evidence when those relationships are part of the task.
Final prose is useful context, but it is not the source of truth.

To adjust the inner live-agent budget for a live run:

```bash
SITU_ANTHROPIC_KEY=sk-ant-... mise run evals -- --timeout-seconds 180
```

To observe the temporary world while a live eval runs:

```bash
SITU_ANTHROPIC_KEY=sk-ant-... mise run evals -- --watch
```

Watch mode prints a `LIVE_AGENT_EVAL` line with the temporary SQLite `dbPath`
and keeps the world after the eval finishes.

For trace correlation during a live agent eval, run Situ with the standard
tracing surface:

```bash
SITU_OTEL_EXPORTER_OTLP_ENDPOINT=http://localhost:4318/v1/traces SITU_ANTHROPIC_KEY=sk-ant-... mise run evals -- --watch
```

## Fixture Packages

Fixture data lives in workspace packages under:

```text
projects/evals/packages/
  fixtures/
  worlds/
```

`@situ/evals-fixtures` is pure data: repository files, scenario prompts,
expected markers, and seed records.

`@situ/evals-worlds` turns fixture data into isolated local worlds: temporary
repositories, migrated SQLite databases, seeded durable state, and live agent
runs.

Keep fixture data separate from app runtime imports so scenarios stay easy to
review and reuse.
