---
title: Module Organization
status: active
---

# Policy: Module Organization

## Applies To

New modules, meaningful refactors, eval suites, harness runtime packages,
repositories, tools, workers, and agent-facing architecture.

## Rule

Prefer small files with clear ownership folders. A future agent should be able
to find the class, tool, evaluator, repository, or scenario it needs without
parsing a broad mixed-concern module.

Use flatter files for process entrypoints and thin application surfaces. Use
nested ownership folders for durable concepts that future agents will extend.

The default durable-concept style is:

```text
domain/
  concept_name/
    concept_name_kind.py
```

Examples:

```text
repositories/runs/runs_repository.py
records/run/run_record.py
tools/run_experiment/tool.py
evaluators/tool_was_called/evaluator.py
worlds/micrograd/scenarios/suspicious_win/scenario.py
```

The preferred Python harness shape is:

```text
projects/harness/src/almanac/harness/
  app.py
  cli.py
  stdio.py
  core/
    db/
      database.py
      migrations.py
      serialization.py
    trust/
      checks.py
    workers/
      manager.py
  repositories/
    experiments/
      experiments_repository.py
    findings/
      findings_repository.py
  records/
    experiment/
      experiment_record.py
    finding/
      finding_record.py
```

`core/` is for cross-cutting harness infrastructure. Product-state concepts
should not disappear into `core/`; they should live in `repositories/`,
`records/`, `tools/`, `agents/`, or another product-facing domain folder.

## Required Checks

- Prefer one primary class, tool, evaluator, repository, or scenario per file.
- Use folders to name ownership boundaries, not only file names.
- Keep `__init__.py` files as small export surfaces; do not hide substantial
  implementation there.
- Split broad `models.py`, `records.py`, `repositories.py`, `utils.py`,
  `helpers.py`, or `evaluators.py` files once they contain multiple durable
  concepts.
- Put shared helper functions next to the concepts they support. If a helper is
  used by many siblings, put it in a clearly named local support file.
- Keep suite/case files thin. Test or eval cases should read as declarations of
  behavior, not as the place where the world simulation or runner logic lives.
- Prefer explicit names like `experiments_repository.py`,
  `experiment_record.py`, `tool.py`, `evaluator.py`, `case.py`, `scenario.py`,
  or `runner.py` inside a named folder.
- Put repositories under `harness/repositories/<concept>/<concept>_repository.py`.
- Repository concepts are usually plural collection names, like `experiments`
  or `findings`.
- Put persistence record models under
  `harness/records/<singular_concept>/<singular_concept>_record.py`.
- Record concepts are usually singular entity names, like `experiment` or
  `finding`.
- Put DB plumbing, trust checks, and worker infrastructure under
  `harness/core/db/`, `harness/core/trust/`, and `harness/core/workers/`.
- Keep thin entrypoints like `app.py`, `cli.py`, and `stdio.py` flat at the
  harness package root unless they become broad enough to need a folder.
- Keep thin TypeScript application entrypoints like `main.tsx` flat inside the
  owning project when the project has no durable domain concepts yet.
- Avoid premature framework abstraction. Add folders because they clarify
  ownership, not because every tiny function needs a package.

## Acceptable Exceptions

- A very small script-like entry point can stay in one file.
- Closely coupled private helper functions may live with the only class that
  uses them.
- Generated code can follow the generator's layout.
- Temporary experimental code may stay compact until it becomes durable.
- Existing legacy modules can be migrated incrementally. New durable code
  should follow the target shape unless it is part of a scoped compatibility
  bridge.

## Red Flags

- A file mixes orchestration, data models, persistence, evaluation logic, and
  rendering.
- A file has several unrelated classes that future changes will likely touch
  independently.
- A catch-all `models.py`, `records.py`, `repositories.py`, or `utils.py`
  becomes the default dumping ground.
- New concepts are added to a broad file only because importing from an existing
  module is convenient.
- Folder names do not explain ownership boundaries.
- Repository, record, worker, trust, or DB code is added to the old flat layout
  when a target ownership folder would be clearer.

## Review Questions

- Can a future agent find the relevant concept from the path alone?
- Does the file have one obvious reason to change?
- Would adding the next related concept make this file feel crowded?
- Is the extra folder improving clarity, or just adding ceremony?
- Are imports still straightforward after splitting?
