---
name: situ-policy-eval-strategy
description: Use whenever adding, modifying, or reviewing Situ evals, live agent evals, prompt evals, runtime skill evals, or model-dependent test coverage.
---

# Eval Strategy

Evals protect agent behavior that is too important to rely on manual
review. Product and infrastructure correctness belong in tests unless the
question depends on model judgment, prompting, tool choice, or research quality.
In Situ, agent evals are LLM-backed. Non-LLM checks for prompts, runtime skills,
fixtures, and seeded durable state are tests, even when they use Evalite.

## Boundary

- **Tests** answer: did the app, API, database, scheduler, Replicache sync,
  filesystem behavior, or browser UI do the deterministic product thing?
- **Evals** answer: given working infrastructure, did the Manager, Scientist,
  or Verifier make the right agentic move?
- **Product E2E tests** live under `projects/e2e-tests` and should prove
  user-visible product flows and infra wiring.
- **Live agent evals** live under `projects/evals`, may use real infrastructure
  as a harness, and should measure model/tool behavior from staged worlds.
- If the assertion can be satisfied with fake agent output, prefer a test. If
  the assertion needs a real agent to decide, use an eval.

## Rules

- Prompt, runtime skill, fixture, and seeded-world checks are tested under
  `projects/evals/src`.
- Evals use `@situ/evals-fixtures` for pure scenario data and
  `@situ/evals-worlds` for temp repos, migrations, seeded SQLite state, and live
  CLI/agent execution.
- Live agent evals isolate `SITU_HOME`, `SITU_REPO_PATH`, and `SITU_DB_PATH`.
- Live agent evals require explicit `SITU_ANTHROPIC_KEY` and fail clearly when
  it is absent. They do not read the saved UI key.
- Live agent evals assert on durable state: ResearchProjects,
  ResearchProjectInteractions, ResearchTasks, ResearchTaskVerifications, work
  items, Claude runs/events, hypotheses, baselines, experiments, evaluations,
  measurements, artifacts, entity links, and typed activities.
- Normal live agent evals target 2-3 minutes. A focused Scientist-plus-Verifier
  eval may use a larger explicit budget.
- A normal live agent eval starts from a staged fixture world and runs one
  focused Manager, Scientist, Verifier, scheduler, work-item, or CLI slice.

## Avoid

- Full prompt snapshots when a small marker test would be clearer.
- A product or infra regression hidden inside an eval when it could be a test.
- A test that claims to validate agent quality using fake or canned model
  output.
- A live agent eval that reads saved runtime secrets implicitly.
- A model-dependent behavior shipping with no eval or runtime smoke path.
- A normal live agent eval that tries to run an entire autoresearch session from
  scratch.
- Raising timeouts before checking whether the staged world is too broad.
- Passing an eval because final prose looked plausible while durable records are
  missing.

## See also

- `situ-add-eval`
- `situ-run-and-verify-evals`
- `.agents/docs/evals-playbook/DOC.md`
- `situ-policy-runtime-skills`
- `situ-policy-agent-tool-surface`
