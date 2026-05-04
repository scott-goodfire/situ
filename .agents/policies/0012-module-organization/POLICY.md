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

The default style is:

```text
domain/
  concept_name/
    concept.py
```

Examples:

```text
repositories/runs_repository/repository.py
tools/run_experiment/tool.py
evaluators/tool_was_called/evaluator.py
worlds/micrograd/scenarios/suspicious_win.py
```

## Required Checks

- Prefer one primary class, tool, evaluator, repository, or scenario per file.
- Use folders to name ownership boundaries, not only file names.
- Keep `__init__.py` files as small export surfaces; do not hide substantial
  implementation there.
- Split broad `models.py`, `utils.py`, `helpers.py`, or `evaluators.py` files
  once they contain multiple durable concepts.
- Put shared helper functions next to the concepts they support. If a helper is
  used by many siblings, put it in a clearly named local support file.
- Keep suite/case files thin. Test or eval cases should read as declarations of
  behavior, not as the place where the world simulation or runner logic lives.
- Prefer explicit names like `repository.py`, `tool.py`, `evaluator.py`,
  `case.py`, `scenario.py`, or `runner.py` inside a named folder.
- Avoid premature framework abstraction. Add folders because they clarify
  ownership, not because every tiny function needs a package.

## Acceptable Exceptions

- A very small script-like entry point can stay in one file.
- Closely coupled private helper functions may live with the only class that
  uses them.
- Generated code can follow the generator's layout.
- Temporary experimental code may stay compact until it becomes durable.

## Red Flags

- A file mixes orchestration, data models, persistence, evaluation logic, and
  rendering.
- A file has several unrelated classes that future changes will likely touch
  independently.
- A catch-all `models.py` or `utils.py` becomes the default dumping ground.
- New concepts are added to a broad file only because importing from an existing
  module is convenient.
- Folder names do not explain ownership boundaries.

## Review Questions

- Can a future agent find the relevant concept from the path alone?
- Does the file have one obvious reason to change?
- Would adding the next related concept make this file feel crowded?
- Is the extra folder improving clarity, or just adding ceremony?
- Are imports still straightforward after splitting?
