---
name: situ-policy-eval-strategy
description: Use whenever adding, modifying, or reviewing Situ evals, live agent evals, or model-dependent test coverage — including where prompt/skill/fixture checks live.
---

# Eval Strategy

Evals protect agent behavior that is too important to rely on manual review. In
situ, evals are **always LLM-backed**. If an assertion does not require a real
Claude call, it is a test — even when it covers a prompt, runtime skill,
fixture, or seeded durable state.

## Where Things Live

- **Live LLM evals → `projects/evals/`.** Evalite suites that hit a real Claude
  Managed Agent or Anthropic message endpoint. They require
  `SITU_ANTHROPIC_KEY` and run via `mise run evals`.
- **Non-LLM checks → co-located `*.test.ts`.** Prompt marker checks, runtime
  skill marker checks, fixture shape, seeded durable state, and any other
  deterministic assertion lives next to the source it exercises. They run via
  `mise run test`. See `situ-policy-test-file-placement`.
- **Whole-app live tests → `projects/e2e-tests/`.** Playwright specs and live
  agent slice runners that exercise the full runtime end-to-end. They may
  require `SITU_ANTHROPIC_KEY` and gate on `SITU_E2E_SKIP_LIVE_AGENT`. See
  `situ-policy-e2e-test-shape`.

## Rules

- Live agent evals isolate `SITU_HOME`, `SITU_REPO_PATH`, and `SITU_DB_PATH`,
  require explicit `SITU_ANTHROPIC_KEY`, and fail clearly when it is absent.
  They do not read the saved UI key.
- Live agent evals assert on durable state: ResearchProjects,
  ResearchProjectInteractions, ResearchTasks, ResearchTaskVerifications, work
  items, Claude runs/events, hypotheses, baselines, experiments, evaluations,
  measurements, artifacts, entity links, and typed activities.
- Normal live agent evals target 2-3 minutes. A focused Scientist-plus-Verifier
  eval may use a larger explicit budget.
- A normal live agent eval starts from a staged fixture world and runs one
  focused Manager, Scientist, Verifier, scheduler, work-item, or CLI slice.
- Evals use `@situ/evals-fixtures` for pure scenario data and
  `@situ/evals-worlds` for temp repos, migrations, seeded SQLite state, and
  live CLI/agent execution. Those packages stay under `projects/evals/packages/`
  because they exist to serve eval suites.
- If the assertion can be satisfied without a real LLM call, it is a test —
  move it to a `*.test.ts` next to the code it exercises.

## Avoid

- A non-LLM check living under `projects/evals/` because Evalite was
  convenient.
- A full prompt snapshot when a small marker test would be clearer.
- A product or infra regression hidden inside an eval when it could be a test.
- A test that claims to validate agent quality using fake or canned model
  output.
- A live agent eval that reads saved runtime secrets implicitly.
- A model-dependent behavior shipping with no eval or runtime smoke path.
- A normal live agent eval that tries to run an entire autoresearch session
  from scratch.
- Raising timeouts before checking whether the staged world is too broad.
- Passing an eval because final prose looked plausible while durable records
  are missing.

## See also

- `situ-policy-test-file-placement`
- `situ-policy-e2e-test-shape`
- `situ-add-eval`
- `situ-run-and-verify-evals`
- `.agents/docs/evals-playbook/DOC.md`
- `situ-policy-runtime-skills`
- `situ-policy-agent-tool-surface`
