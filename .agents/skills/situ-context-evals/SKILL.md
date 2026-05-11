---
name: situ-context-evals
description: Use when learning, adding, debugging, or interpreting Situ evals, fixture worlds, runtime-skill tests, prompt tests, or live agent evals.
---

# Situ Context Evals

## Goal

Learn the eval system by locating tests, fixtures, worlds, scorers, and
runners. Do not infer eval behavior from production code alone.

## What To Look For

Locate eval package shape:

- eval runner package
- fixture package
- world package
- test/eval scripts
- eval docs and policies
- tests vs live agent eval boundaries

Locate prompt and runtime-skill tests:

- prompt marker tests
- runtime-skill marker tests
- required markers
- forbidden markers
- Manager prompt expectations
- Scientist prompt expectations
- Verifier prompt expectations
- runtime skill markdown loaded by roles

Locate fixture worlds:

- scenarios
- seed records
- fixture repository files
- workspace/repo materialization
- world creation
- database seeding
- durable-state snapshotting
- bridge/runner code
- scorer code

Locate live agent eval boundaries:

- live-eval environment gates
- network/API key requirements
- timeout and budget controls
- skipped or zero-eval live files
- observed durable-state assertions

Locate proof:

- prompt test scores
- runtime-skill test scores
- fixture package tests
- world package tests
- state eval assertions
- live agent eval behavior when live mode is enabled

## What To Learn

Build a file-backed answer to:

- Is this prompt test, runtime-skill test, fixture-world test, state test, or
  live agent eval?
- What fixture state does the eval start from?
- What behavior or marker does the scorer require?
- What old or invalid behavior is forbidden?
- What durable state does the eval inspect?
- Which package/script runs this eval?
- What gap remains between tests and live eval behavior?

## Investigation Pattern

For an eval question:

1. Identify eval type from imports, scorer shape, and file naming.
2. Locate fixture data and world setup by scenario/seed/world terms.
3. Read the scorer and expected markers or durable-state assertions.
4. If a prompt/runtime skill changed, inspect both required and forbidden
   markers.
5. Run the exact eval area first, then the full eval suite.

Load eval policies/workflows when adding, reviewing, or changing eval
worlds, Evalite marker scorers, runtime skills, or live agent eval behavior.

## Verification

Use checks that match the change:

- eval runner checks for prompt/runtime test changes
- fixture tests for seed/scenario changes
- world tests for materialization or seeding changes
- full test suite for prompt/runtime skill changes

## Reporting

Report test/eval type, fixture/world source, scorer behavior, command run,
score, and test-vs-live coverage gaps.
