---
name: situ-context-research-flow
description: Use when learning or explaining Situ's end-to-end ResearchProject, ResearchTask, Scientist, Verifier, and workspace flow.
---

# Situ Context Research Flow

## Goal

Learn the current research loop from implementation. Use docs as a map,
but verify every transition against current source, tests, and evals.

## What To Look For

Locate the product expectations and active data model:

- verified search / verified task-tree docs
- `ResearchProject`
- `ResearchProjectInteraction`
- `ResearchTask`
- `ResearchTaskVerification`
- project `goal`, `phase`, `status`, and baseline/result summaries
- task `workerPrompt`, `verificationPrompt`, status, type, priority, and
  parent-child lineage

Locate user onboarding and baseline flow:

- user goal submission
- single active project behavior
- manager onboarding work
- user questions
- baseline confirmation
- blocked-on-user state
- project phase change from onboarding into search/workspace

Locate manager, scientist, and verifier handoffs:

- manager prompt and runtime guidance
- scientist prompt and runtime guidance
- verifier prompt and runtime guidance
- tools that ask the user or present a baseline
- tools that create research tasks
- tools that submit work for verification
- tools that record verification judgment

Locate task dispatch and queue behavior:

- manager work enqueueing
- planned task claiming
- scientist work enqueueing
- awaiting-verification task detection
- verifier work enqueueing
- work-item handling and agent-run execution

Locate sync and UI behavior:

- Replicache output for project, interaction, task, and verification rows
- hooks that subscribe to those synced records
- route and redirect behavior
- sidebar/navigation gating
- setup view
- workspace view
- report/evidence surfaces

Locate proof:

- route/runtime tests for project creation, baseline confirmation, task
  dispatch, verifier dispatch, and Replicache output
- repository tests for project/task/verification persistence
- prompt tests or evals for Manager, Scientist, and Verifier behavior
- runtime-skill evals for role guidance
- workspace/setup stories or tests, including missing coverage

## What To Learn

Build a file-backed answer to:

- Where does the user's goal become durable state?
- What prevents or permits multiple active research projects?
- How does onboarding ask questions and present the baseline?
- What changes when the workspace "opens"?
- Is that route protection, redirect behavior, or navigation/sidebar
  gating?
- How does Manager planning become durable `ResearchTask` work?
- How does Scientist work become Verifier work?
- How does verification update task state and project evidence?
- Which tests/evals/stories prove the flow?
- What expected coverage is missing?

## Investigation Pattern

Draw this flow in notes and attach a source reference to every arrow:

```text
user goal -> ResearchProject -> onboarding -> baseline confirmation
-> ResearchTask planning -> Scientist -> Verifier -> workspace/report
```

If an arrow has no source reference, mark it as an assumption. If one
term misses because names moved, search adjacent nouns, statuses, role
names, and tool names.

## Verification

Use checks that match the change:

- app/runtime tests for backend flow changes
- evals for prompt or runtime-skill changes
- web/app-ui checks for setup, workspace, and sidebar changes
- full repo check before finalizing broad flow changes

## Reporting

Report phases, responsible role at each phase, durable records touched,
UI/sync path, tests/evals/stories read or run, and unresolved gaps.
