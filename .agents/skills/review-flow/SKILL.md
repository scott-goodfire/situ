---
name: review-flow
description: >-
  Use when the user asks to understand, audit, or explain the Situ
  autoresearch control flow: objective kickoff,
  Manager/Researcher/Scientist/Critic roles, runtime prompts, toolsets, task
  workflows, Critic review gating, record statuses, activities, and what can
  run in parallel. The skill guides an evidence-backed walkthrough from the
  current code, including simulated multi-agent loop examples.
---

# Review Flow

## Goal

Explain how the Situ autoresearch loop works from the current codebase. Build
the answer from local evidence, then walk through concrete loop examples in
plain language: objective kickoff, role prompts, toolsets, tasks, record
statuses, activities, Critic review, replanning, and parallelism.

Do not answer from memory or prior conversation. Read the code that currently
defines the runtime.

## Evidence Pass

Start with these files and expand only as needed:

```bash
sed -n '1,220p' .agents/docs/agents-surface/DOC.md
sed -n '1,260p' .agents/specs/0019-pull-based-workflow-state/SPEC.md
sed -n '1,560p' projects/harness/src/situ/harness/agent_runtime.py
sed -n '1,540p' projects/harness/src/situ/harness/tools/toolsets.py
sed -n '1,540p' projects/harness/src/situ/harness/agents/research/prompt.py
sed -n '1,760p' projects/harness/src/situ/harness/core/dbos/task_workflows.py
sed -n '1,180p' projects/harness/src/situ/harness/core/critic_review.py
sed -n '1,180p' projects/harness/src/situ/harness/core/task_execution/claim.py
sed -n '1,220p' projects/harness/src/situ/harness/core/task_execution/postconditions.py
sed -n '1,120p' projects/harness/src/situ/harness/agent_skills/registry.py
```

Then inspect role skills relevant to the question:

```bash
find projects/harness/src/situ/harness/agent_skills -name SKILL.md | sort
```

Useful search patterns:

```bash
rg -n "run_manager|run_researcher|run_scientist|run_review|DBOS|Queue|enqueue|claim|has_pending_critic_records|list_pending_critic_records" projects/harness/src/situ/harness
rg -n "build_.*toolset|Toolset|submit_|complete_|accept_|cancel_|fail_|list_.*activities" projects/harness/src/situ/harness/tools
rg -n "critic|review|in_review|triage|replan|planning" projects/harness/src/situ/harness .agents/specs .agents/docs
rg -n "critic|parallel|queue|workflow|manager|scientist|researcher" projects/harness/tests evals
```

Use tests and eval worlds as evidence for intended runtime behavior, especially
when the implementation has several branches:

```bash
sed -n '1,760p' projects/harness/tests/test_app_agent_loop.py
sed -n '1,260p' projects/harness/tests/test_backend_invariants.py
find evals/worlds -name 'test_world.py' -o -name 'world.py' | sort
```

If the user explicitly authorizes subagents, split exploration into disjoint
questions: runtime/DBOS queues, role prompts and skills, toolsets and status
tools, tests/evals. Otherwise do the evidence pass locally.

## What To Understand

Build a compact mental model across these dimensions:

- **Kickoff**: how objective and setup context become a session/project and
  initial work.
- **Roles**: which runtime agent exists for Manager, Researcher, Scientist,
  and Critic; what prompt builder, skill capabilities, and toolsets each gets.
- **Task flow**: how tasks are created, claimed, completed, canceled, failed,
  and linked to records.
- **Record flow**: how analyses, hypotheses, baselines, experiments, and
  evaluations move through `triage`, `accepted`, `active`, `in_review`, `done`,
  `canceled`, and `failed`.
- **Evidence flow**: where activities, measurements, artifacts, and events are
  written; which tools read broad context versus focused activity trails.
- **Critic gate**: what statuses trigger Critic review, what the Critic can
  mutate, and how Manager replanning waits for review-lane records to clear.
- **Parallelism**: which DBOS queues/workflows can run at the same time, which
  resources serialize work, and which dependencies or status gates impose order.
- **No-op and escape hatches**: what happens when agents do not call expected
  tools, fail postconditions, cancel work, or leave review records pending.

## Walkthrough Requirement

Produce at least two concrete simulated loops. Prefer three when the user asks
for depth:

1. **Happy path**: objective -> Manager planning -> Researcher/Scientist work
   -> baseline/evaluation/experiment evidence -> Critic review -> Manager
   replanning.
2. **Critic rejection path**: a record reaches `triage` or `in_review`, Critic
   cancels with a comment, then Manager reacts.
3. **Parallel work path**: multiple runnable tasks or workflows exist; explain
   which agents can run concurrently and what prevents unsafe overlap.

Each walkthrough should be numbered and concrete, usually 10-15 steps. Name the
agent, trigger, tools likely used, records touched, statuses before/after, and
durable evidence written.

Example step shape:

```text
4. Scientist claims T3 (`baseline`) through the Scientist workflow. It reads
   `baseline-task`, runs the workspace command, creates B1/EV1/M1, then calls
   `submit_baseline(baseline_id="B1", comment=...)`. B1 moves `active ->
   in_review`; `baseline_activities` gets `status_updated` plus `comment`.
```

## Output Shape

Use this structure:

```text
Evidence checked
- <files/functions/tests actually read>

Flow map
- Manager: trigger, prompt, tools, skills, responsibilities
- Researcher: ...
- Scientist: ...
- Critic: ...

State and evidence model
- Tasks: <statuses and ownership>
- Research records: <statuses and Critic lanes>
- Activities/measurements/artifacts/events: <where evidence lands>

Parallelism model
- What can run at once
- What is serialized or gated
- What happens after Critic review

Walkthrough A: happy path
1. ...

Walkthrough B: rejection/no-op/blocked path
1. ...

Walkthrough C: parallelism path
1. ...

Open questions or risks
- <only evidence-backed uncertainties>
```

For small questions, shorten the output but still cite the files or functions
you checked.

## Anti-Patterns

- Do not explain the flow from stale memory, summaries, or specs alone.
- Do not inspect only prompts; prompts, toolsets, runtime workflows, and tests
  all matter.
- Do not claim agents run in parallel unless queue/workflow evidence supports
  it.
- Do not treat runtime agent skills under
  `projects/harness/src/situ/harness/agent_skills/` as developer skills under
  `.agents/skills/`.
- Do not make code/spec changes while using this skill unless the user asks for
  implementation after the review.
