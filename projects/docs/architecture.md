# Architecture

situ is a local web app and runtime that turns a user goal into a durable
research project. Claude Managed Agents do the planning, experiment execution,
and verification work; situ stores the state, schedules the next turn, and syncs
progress into the UI.

## Core models

- `ResearchProject`
  - The top-level goal.
  - Tracks phase, status, baseline summary, and final result summary.
  - Owns the project-level search loop.
- `ResearchProjectInteraction`
  - A pending user question or confirmation.
  - Used when the Manager needs a decision before continuing.
- `Baseline`
  - The Manager-owned project setup baseline records the metric, native command
    or evaluation path, assumptions, and comparison standard the user confirms
    before autonomous research starts.
  - Scientists can also record task evidence baselines during ResearchTasks.
- `ResearchTask`
  - A unit of work created by the Manager.
  - Includes a `workerPrompt` for the Scientist and a `verificationPrompt` for
    the Verifier.
  - Can point at a parent task or target entity.
- `ResearchTaskVerification`
  - The Verifier's judgment for a task.
  - Moves the task to `verified` when it passes.
  - Moves the task to `rejected` when the evidence does not hold up.
- Evidence records
  - `Hypothesis`, `Experiment`, `Baseline`, `Evaluation`, `Measurement`, and
    `Artifact`.
  - Created while tasks run so the result is inspectable after the agent turn.
- `WorkItem`
  - Runtime queue entry for Claude work.
  - Turns durable project or task state into a Manager, Scientist, or Verifier
    run.

## System flow

A user goal becomes a `ResearchProject`. situ then enqueues a Manager work item
for that project. The `ManagerAgent` reads the project state, asks the user for
input if needed, creates or revises the project setup baseline, and presents it
for confirmation. Interactive runs wait for the user; headless `situ exec`
auto-confirms only after the baseline is saved.

Once the baseline is confirmed, the project enters `search` phase and the
Manager can create `ResearchTask` records for concrete pieces of work. Planned
tasks are dispatched to the `ScientistAgent`. The Scientist runs the task,
usually in an isolated worktree, and records the evidence it produced:
hypotheses, experiments, evaluations, measurements, and artifacts. When the task
is ready for review, it moves to `awaiting_verification`.

The `VerifierAgent` then checks the task against its `verificationPrompt` and
records a `ResearchTaskVerification`. Passed tasks become `verified`; failed or
suspicious tasks become `rejected`. Once there is no active task work left, the
Manager gets another turn and decides what to do next.

## Example

If you run:

```bash
situ exec --objective "Improve spelling-corrector accuracy without slowing it down"
```

- situ creates a `ResearchProject` for the objective.
- The `ManagerAgent` creates a durable project setup baseline and presents it
  for confirmation.
- After confirmation, the project enters `search` phase.
- The `ManagerAgent` creates or selects one primary `Hypothesis`, then
  creates a hypothesis-targeted `ResearchTask`, such as "try a candidate
  edit-distance pruning change."
- The `ScientistAgent` runs the task in a worktree.
- The `ScientistAgent` records an `Experiment`, an `Evaluation`, and
  `Measurement` rows. The `Experiment` records the primary hypothesis it
  tests.
- The task moves to `awaiting_verification`.
- The `VerifierAgent` checks the evidence and records a
  `ResearchTaskVerification`.
- The `ManagerAgent` decides the next task or completes the project.

The web UI reads the same durable records through Replicache, so the project
timeline, research map, task state, and evidence pages all reflect the local
SQLite session state.
