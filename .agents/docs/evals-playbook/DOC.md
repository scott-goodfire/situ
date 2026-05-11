# Evals Playbook

Situ evals are staged checks for a local autoresearch supervisor. They should
make the live loop understandable and trustworthy without attempting to replay a
full multi-hour or multi-day research session during normal development.

See `situ-policy-eval-strategy` for the review rubric, `situ-add-eval` for the
add-eval workflow, and `situ-run-and-verify-evals` for commands. See
`.agents/docs/live-eval-observation/DOC.md` when a live agent eval needs to be
watched while it runs.

## Tests vs Evals

Use tests when the question is whether the product or infrastructure works:
routes, repositories, migrations, scheduler dispatch, settings, Replicache sync,
browser UI, and deterministic status transitions. A test may use fake agent
output to prove the system stores or displays it correctly.

Use evals when the question is whether an agent behaves well given working
tools and state: Manager onboarding, baseline judgment, ResearchTask planning,
Scientist evidence creation, Verifier skepticism, explore/exploit decisions,
and final evidence-linked synthesis.

Evals are LLM-backed. Non-LLM checks for prompt markers, runtime skill markers,
fixture shape, or seeded durable state are tests. Product E2E tests live under
`projects/e2e-tests`.

## Layers

Tests protect mechanical behavior. They run without credentials through
`mise run test` and cover prompt markers, runtime skill markers, fixture shape,
and fixture-backed durable state.

Live agent evals protect model/tool behavior. They run through
`mise run evals`, require `SITU_ANTHROPIC_KEY`, and intentionally hit real
Claude Managed Agents. They use isolated temporary state and assert on durable
SQLite records.

Long autoresearch soak tests are a separate category. They may run for hours
and should not be part of normal test, e2e-test, or eval verification.

## Staged Worlds

Prefer starting from a realistic fixture stage instead of booting every live
eval from an empty world:

- empty repo that needs baseline discovery
- confirmed durable project setup baseline
- candidate experiment already run
- suspicious comparability-break state
- pending review or follow-up task

Each world should contain enough durable state to make one focused action
meaningful. The eval should then run one real slice: a Manager turn, Scientist
ResearchTask, Verifier check, scheduler dispatch, work-item handler, or CLI
command.

## Runtime Budgets

Live agent evals should usually complete in 2-3 minutes. A staged eval that
intentionally exercises both a Scientist task and a Verifier pass may need a
larger bounded budget.

When an eval needs more than three minutes, narrow the stage before increasing
the budget. Seed more state, run fewer scheduler steps, or assert a smaller
behavior.

## What Must Be Real

For live agent evals, keep these real:

- Claude Managed Agent session and event flow
- Situ custom tool calls
- SQLite writes through the app surface or realistic world setup
- filesystem workspace behavior when the scenario depends on files

It is fine to seed prior durable state. Seeding is how a short eval represents
the middle of a larger autoresearch session.

## Assertions

Assert durable state, not final prose:

- ResearchProjects created, blocked, started, completed, or failed
- ResearchProjectInteractions record user questions and baseline confirmations
- baseline confirmation interactions reference a Manager-owned project baseline
  id, and the project reaches `search` before ResearchTasks are planned
- ResearchTasks created, completed, failed, or submitted for verification
- no ResearchTask or Scientist work item appears before the project reaches
  `search`
- ResearchTaskVerifications record pass, fail, suspicious, or needs-more-evidence
  outcomes
- Claude runs and events recorded
- hypotheses, baselines, experiments, evaluations, measurements, artifacts, and
  entity links created in the expected shape
- typed activities record comments, concerns, or review outcomes
- forbidden workspace changes, such as editing `prepare.py`, are absent

Live evals that exercise verification can also assert on advisory
signals carried on the verification payload, not just the verdict.
The first such signal is `verification.payload.signals.suspicious_holdout_divergence`,
emitted by the Verifier skill when the dev and held-out splits disagree.
Use `requiredVerificationMarkers` for structural emission cases
(for example `"suspicious_holdout_divergence":true` should be present),
and `forbiddenVerificationMarkers` for guardrail cases where the
signal must not appear (agreement between splits, or missing
held-out evidence). Manager-side cases can pair these with
durable-state assertions on the redesign exploit task the Manager
auto-dispatches when it sees the signal.

Use final assistant prose only as debug context.

## Debugging Timeouts

When a live agent eval times out, identify the blocking stage before changing
the timeout:

- missing or invalid `SITU_ANTHROPIC_KEY`
- Managed Agent session or skill sync
- work item stuck pending or claimed
- Claude run waiting for action
- scheduler idle condition never reached
- assertion too broad for the staged world

Prefer adding progress metadata to the world runner over increasing the eval
budget.
