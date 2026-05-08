# Compute Leases

## Purpose

Situ runs Scientist work that needs scarce machine resources. Even on a single
laptop, a long-running experiment monopolizes the workspace, the GPU, and any
local subprocess slot. This spec defines how Situ models compute as durable
coordination state so multiple Scientist tasks can be queued, gated, and made
visible without colliding over those resources.

This spec narrows the durable coordination posture from
[0019-pull-based-workflow-state](../0019-pull-based-workflow-state/SPEC.md) and
the local-first runtime posture from
[0014-local-app-runtime](../0014-local-app-runtime/SPEC.md).

## Scope

Situ coordinates compute locally. A compute target is a slot on the user's
machine that Scientist tasks lease one at a time. Targets, claims, and waits
are recorded in the canonical SQLite database alongside tasks, sessions, and
activities.

Remote execution is out of scope. Situ does not connect to clusters, schedule
remote jobs, or move workspaces between machines. Pools that do not correspond
to a registered local target hold tasks in a visible waiting state until the
operator registers a matching target.

## Concepts

A **compute pool** is a label that groups interchangeable compute targets. A
Scientist task names the pool it needs in `task.payload.compute.pool`. The
default pool is `local`.

A **compute target** is a registered slot in a pool. Each target represents
one unit of concurrent Scientist execution.

A **compute lease** is a target's claim by a single Scientist task. Leasing is
atomic: a target is either idle or claimed by exactly one task.

## Compute Target Record

Compute targets live in the canonical SQLite database with no project scope.
They coordinate Scientist work across every project on the machine.

Fields:

- `id`: stable target id (`CT1`, `CT2`, ...).
- `pool`: pool label.
- `kind`: execution model. `local` is the only kind that runs Scientist work.
- `label`: optional human-readable name.
- `status`: lifecycle state.
- `claimed_by_task_id`: the leasing task while `status` is `claimed`.
- `claimed_at`: timestamp of the current lease.
- `last_heartbeat`: timestamp of the most recent target liveness signal.
- `metadata`: operator JSON. Recognized local execution keys can carry
  non-secret placement hints for the leased Scientist subprocess environment.
- `created_at`, `updated_at`.

## Lifecycle States

```text
idle
claimed
draining
dead
```

State meanings:

- `idle`: registered and available for the next Scientist claim.
- `claimed`: currently holding a lease for one Scientist task.
- `draining`: registered but withdrawn from new claims; a current lease may
  still be running.
- `dead`: removed from the active pool. The row stays for audit.

Valid transitions:

- `idle` → `claimed` on lease.
- `claimed` → `idle` on release.
- `idle` → `draining` on operator drain.
- `claimed` → `draining` on operator drain mid-lease.
- `draining` → `idle` on operator restore.
- `draining` → `dead` once any active lease ends.
- `idle` → `dead` on remove.
- `claimed` → `idle` on orphan recovery when the leasing task is terminal,
  has no recorded workflow id, or the leasing workflow is verifiably ended.

## Lease Atomicity

Lease claims succeed for exactly one task. The repository performs the claim
as a single conditional update keyed on `(target_id, pool, status='idle')` and
treats the operation as failed when no row was updated.

Releases set `status='idle'` and clear the lease fields. A release for a target
the caller does not own is a no-op.

## Default Local Target

A fresh Situ install owns one compute target:

- `pool='local'`
- `kind='local'`
- `label='Local'`
- `status='idle'`

The harness ensures this target exists on every boot. Operators can register
additional `local` targets to run Scientist tasks in parallel on the same
machine.

## Task Compute Declaration

Scientist tasks declare compute needs in their payload:

```json
{
  "compute": {
    "pool": "local"
  }
}
```

A task with no `compute.pool` declares `local`. Manager and Researcher tools
that file Scientist work choose a pool name; they do not pin a specific target.

## Local Execution Environment

Local compute targets can contribute bounded execution placement hints to
Scientist workspace commands while the lease is held. The harness derives this
environment from recognized non-secret metadata keys on the claimed target.

Supported metadata keys:

- `cuda_visible_devices`: maps to `CUDA_VISIBLE_DEVICES` for workspace
  subprocesses launched by the leased Scientist task.

The Scientist command environment also includes internal target identity fields
such as the claimed target id and pool. These fields are internal worker
handoff context scoped to subprocess execution.

Execution placement hints apply only to workspace commands launched by the
Scientist task that owns the lease. Manager, Researcher, Critic, setup, and
operator commands run without leased-target placement hints.

## Workflow Behavior

When a Scientist workflow runs:

1. It reads the task's declared pool.
2. It claims one idle target in that pool.
3. If a target is claimed, the workflow runs the Scientist body and releases
   the target when the body finishes, fails, or is canceled. Workspace commands
   launched by that Scientist body inherit the claimed target's local execution
   placement hints.
4. If no idle target exists for a pool with at least one registered target,
   the workflow records `task.waiting_for_compute`, returns the task to
   backlog, clears its workflow id, and sets a short `available_at` backoff.
5. If no target has ever been registered for the pool, the workflow records
   `task.compute_pool_unknown` and parks the task the same way.

Re-enqueued attempts use a per-attempt workflow id of the shape
`task:{task_id}:a{attempt}`. The attempt counter lives on `task.payload`.

The workflow surfaces a single `awaiting_compute` task activity per
contiguous wait. Repeated unsuccessful attempts update that activity in place
(latest attempt count, latest waited timestamp). A change in compute pool or a
transition between `compute_pool_unknown` and `waiting_for_compute` closes the
existing activity and opens a new one.

## Runnable Task Dispatch

DBOS runs a scheduled dispatch sweep on a short, conservative cadence. The sweep finds
runnable backlog tasks whose `workflow_id` is empty and enqueues one workflow
attempt for each eligible task.

Runnable tasks have:

- `status='backlog'`
- `workflow_id IS NULL`
- `available_at <= now`
- satisfied dependencies
- an active project
- an active creating session

The sweep is the only retry path for tasks parked while awaiting compute.
Target release only returns the leased target to the pool; the next sweep
observes the newly idle target and dispatches eligible waiting work.

## Orphan Lease Cleanup

On harness boot and during scheduled dispatch sweeps, the runtime releases
compute targets that are stranded in `claimed`:

- Release when the leasing task is in a terminal status (`done`, `failed`,
  `canceled`).
- Release when the leasing task has no recorded workflow id.
- Release when the leasing task has remained `in_progress` past the stale-lease
  threshold and has no recent command receipt activity.
- Otherwise, leave the lease in place.

A target whose lease is conservatively retained is observable through the
target's `claimed_by_task_id` and the task's status. Operators can resolve
ambiguity by removing the target.

## Events

The harness emits these compute events:

- `compute_target.registered`
- `compute_target.claimed`
- `compute_target.released`
- `compute_target.drained`
- `compute_target.removed`
- `task.waiting_for_compute`
- `task.compute_pool_unknown`

Each event carries the target id, pool, and (where applicable) the task id and
attempt counter.

## Agent-Visible Compute Tool

The Manager has a `compute_pools_overview` tool. The tool returns each
registered pool with its idle and claimed counts. Manager prompts call the
tool before filing Scientist tasks that need a non-default pool.

## Operator Surface

The CLI exposes three commands:

- `mise run compute:add` — register a target with a pool, optional label,
  optional metadata, and recognized local placement hints such as
  `cuda_visible_devices`.
- `mise run compute:list` — print every target with status and current
  claimant. Human output includes recognized placement hints when present.
- `mise run compute:remove` — remove a target.

Operator commands cover the install-global pool. They do not take a project
argument.

## Out of Scope

- Remote execution.
- SSH, rsync, Slurm, CoreWeave, or other cluster integration.
- Dynamic target provisioning.
- Per-pool DBOS queues.
- Task pinning to a specific target.
- Per-project compute pools.
- A dedicated compute panel in the TUI or web monitor. Compute pressure is
  observable through `compute:list` and through existing task and event
  surfaces.
- Arbitrary environment-variable injection as general runtime configuration.
- Secret delivery through compute target metadata.

## Review Criteria

- Scientist tasks lease a compute target before running and release it when
  finished, failed, or canceled.
- Leases use an atomic conditional update; no two tasks hold the same target.
- Tasks with no available target wait in a visible state with deduped activity
  records.
- Per-attempt workflow ids prevent collisions between retries of the same task.
- Runnable backlog tasks with empty workflow ids are dispatched by the
  scheduled sweep.
- Orphan lease cleanup runs at startup and only releases targets whose owners
  are terminal, have no recorded workflow id, or have a stale in-progress lease
  with no recent command receipt activity.
- Compute targets are install-global; one machine's pool is shared across
  projects.
- The Manager has a tool to inspect pool state before choosing a pool.
- Operators register, list, and remove targets through the `compute:*` CLI
  commands.
- Recognized non-secret local target placement hints are enforced by the
  harness for Scientist workspace commands while the target is leased.
