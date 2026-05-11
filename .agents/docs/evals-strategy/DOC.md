# Evals Strategy

Situ evals should protect prompts, runtime skills, tool-calling behavior, and
trust checks as the app changes.

Evals are not the general product test layer. Product tests prove that the app,
database, scheduler, API, Replicache sync, and browser UI work. Evals assume
that infrastructure is available and ask whether agents make good research
decisions with it.

In Situ, **evals are LLM-backed**. Non-LLM checks for prompt markers, runtime
skill markers, fixture shape, or seeded durable state are tests.

## Current Layer

The current eval layer is intentionally small and local:

```text
projects/evals/
  evalite.config.ts
  packages/fixtures/
    src/tiny-autoresearch/
  packages/worlds/
    src/tiny-autoresearch/
  src/prompts.eval.ts
  src/runtime-skills.eval.ts
  src/worlds/tiny-autoresearch/state.eval.ts
  src/worlds/tiny-autoresearch/live-agent-eval.ts
```

The prompt, runtime-skill, and state suites are tests and should run often.
Fixture packages are TypeScript workspace packages so eval worlds can import
typed repository files, scenario prompts, expectations, and durable-state seed
records without parsing YAML at runtime.
Live agent evals run through `mise run evals` and require `SITU_ANTHROPIC_KEY`.
The default live eval is the tiny autoresearch baseline Scientist/Verifier
case. Use `mise run evals -- --list` to see the full named suite.

See `.agents/docs/evals-playbook/DOC.md` for how to choose tests, e2e tests,
evals, and long-running soak checks.

## What To Evaluate

Prefer behavior checks over full text snapshots:

- role prompts mention the required tools and boundaries
- runtime skills name the right role, procedure, and durable outputs
- tool affordances guide agents toward durable records
- Verifier and Scientist guidance preserves evidence and comparability

When live agent evals are added, they should assert on durable state:

- ResearchProjects and ResearchProjectInteractions created in the expected phase
- ResearchTasks created, completed, failed, or submitted for verification
- ResearchTaskVerifications created with useful evidence-backed reasons
- hypotheses created with useful content
- baselines, experiments, evaluations, measurements, artifacts, and entity links
  created in the expected order

## Tests First

Use tests for mechanical behavior. Add evals when the model's decision path
matters.

## Live Agent Eval Shape

Live agent evals should use:

- an isolated `SITU_HOME`
- a temporary or fixture workspace
- explicit credential requirements
- bounded runtime
- assertions on SQLite records and Managed Agent events

They should not silently fall back to fake model behavior.
Normal live agent evals should start from staged fixture state and target 2-3
minutes. A focused Scientist-plus-Verifier eval may use a larger explicit
budget.

## Tiny Autoresearch Live Suite

The tiny autoresearch live suite is organized as named cases, each starting
from a fixture world and scoring durable state after real Claude Managed Agent
work:

- `baseline_scientist_verifier` checks baseline discovery and verification.
- `verifier_abbreviated_ids` checks that Verifier recovers from abbreviated
  durable ids by listing/searching state.
- `manager_onboarding_baseline` checks that Manager presents a baseline
  confirmation checkpoint instead of starting autonomous work too early.
- `manager_post_confirmation_task_planning` checks that Manager creates one
  ResearchTask with concrete Scientist and Verifier prompts after onboarding.
- `candidate_experiment_scientist` checks bounded candidate execution and
  comparability verification.
- `adversarial_verifier` checks that Verifier marks evaluation-surface
  shortcuts as suspicious.
- `manager_explore_exploit` checks that Manager exploits verified positive
  signal intentionally.
- `manager_global_optimum_trap` checks that Manager widens the search instead
  of over-exploiting a local ridge.
- `manager_plateau_backtrack` checks that Manager recognizes a flattening
  verified ridge and backtracks or widens.
- `manager_debug_child` checks that Manager creates a debug task for a failed
  child of a promising branch.
- `manager_reward_hacking_guard` checks that Manager rejects strong-looking raw
  scores from invalid evaluation-surface changes.
- `manager_parallel_move_bundle` checks that Manager can create a two-task
  parallel explore/exploit bundle.
- `manager_queues_variant_backlog` checks that Manager queues multiple
  single-variant exploit tasks instead of bundling a variant loop into one
  Scientist task.
- `manager_mid_run_hypothesis_generation` checks that Manager can create a
  fresh testable hypothesis during a mature run.
- `scientist_explore_hypothesis_creation` checks that Scientist can turn
  exploration into a durable Hypothesis instead of prose-only progress.
- `scientist_experiment_primary_hypothesis` checks that Scientist creates
  experiments only after selecting one primary hypothesis and records that
  association durably.
- `manager_no_valid_metric_checkpoint` checks that Manager asks for a missing
  comparable metric instead of inventing one.
- `manager_large_context_compression` checks that Manager can compress a noisy
  tree into a focused synthesis task.
- `manager_verifier_contract_quality` checks that Manager writes verification
  prompts with evidence, invalidators, and comparison targets.
- `synthesis_legibility` checks that a Scientist creates a human-legible report
  artifact linked to durable evidence.
- `final_report_lineage` checks that a Scientist reports winning lineage,
  rejected branches, and remaining uncertainty without overclaiming.

Run one case with `mise run evals -- --case <name>`. Run the whole suite with
`mise run evals -- --case all`.
