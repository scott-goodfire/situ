from __future__ import annotations

from datetime import datetime, timezone

import logfire

from ...config import DEFAULTS
from ...core.db.serialization import utc_now
from ...records import (
    ComputeTargetKind,
    ComputeTargetRecord,
    ComputeTargetStatus,
    TaskRecord,
    TaskStatus,
)
from ...repositories import Repositories
from .evidence_records import fail_owned_evidence_records_for_task
from .events import publish_record, record_event

DEFAULT_LOCAL_POOL = "local"
DEFAULT_LOCAL_LABEL = "Local"

WAIT_BACKOFF_SECONDS = 5
WAIT_BACKOFF_MAX_SECONDS = 300
AWAITING_COMPUTE_ACTIVITY_TYPE = "awaiting_compute"
CUDA_VISIBLE_DEVICES_METADATA_KEY = "cuda_visible_devices"


def task_compute_pool(task: TaskRecord) -> str:
    """Read the requested compute pool from a task payload, default 'local'."""
    compute = task.payload.get("compute")
    if isinstance(compute, dict):
        pool = compute.get("pool")
        if isinstance(pool, str) and pool:
            return pool
    return DEFAULT_LOCAL_POOL


def compute_wait_backoff_seconds(attempt: int) -> int:
    """Return the capped retry delay for a task that could not claim compute."""
    normalized_attempt = max(1, attempt)
    backoff = WAIT_BACKOFF_SECONDS * (2 ** (normalized_attempt - 1))
    return min(backoff, WAIT_BACKOFF_MAX_SECONDS)


def compute_target_execution_env(target: ComputeTargetRecord) -> dict[str, str]:
    """Build the worker subprocess env contributed by a claimed target."""
    env = {
        "SITU_COMPUTE_TARGET_ID": target.id,
        "SITU_COMPUTE_POOL": target.pool,
    }
    if target.label:
        env["SITU_COMPUTE_TARGET_LABEL"] = target.label

    cuda_visible_devices = _metadata_env_value(
        target.metadata.get(CUDA_VISIBLE_DEVICES_METADATA_KEY)
    )
    if cuda_visible_devices is not None:
        env["CUDA_VISIBLE_DEVICES"] = cuda_visible_devices

    return env


def _metadata_env_value(value: object) -> str | None:
    if isinstance(value, str):
        return value
    if isinstance(value, int) and not isinstance(value, bool):
        return str(value)
    return None


async def ensure_default_local_target(
    repos: Repositories,
) -> ComputeTargetRecord:
    """Ensure exactly one local compute target exists in the canonical DB.

    Returns the existing default if any local target is already registered;
    otherwise registers a fresh default. Idempotent across boots.

    The default target is implicit: it is created silently on first boot and
    does not emit a `compute_target.registered` event. Operator-driven
    registrations through `mise run compute:add` are user-meaningful and emit
    the event.
    """
    existing = await repos.compute_targets.list_for_pool(pool=DEFAULT_LOCAL_POOL)
    for target in existing:
        if target.status != ComputeTargetStatus.DEAD:
            return target
    return await repos.compute_targets.register(
        pool=DEFAULT_LOCAL_POOL,
        kind=ComputeTargetKind.LOCAL,
        label=DEFAULT_LOCAL_LABEL,
    )


async def release_orphan_leases(repos: Repositories) -> list[ComputeTargetRecord]:
    """Conservatively release compute targets stranded in `claimed`.

    Releases when:
    - the leasing task is in a terminal status (DONE, FAILED, CANCELED)
    - the leasing task has no recorded workflow_id
    - the leasing task is stale in_progress with no recent command receipt

    Returns the list of targets released by this sweep.
    """
    released: list[ComputeTargetRecord] = []
    release_reasons: dict[str, str] = {}
    now = datetime.now(timezone.utc)

    async def release_target(
        target: ComputeTargetRecord,
        *,
        reason: str,
        owning_task_id: str | None = None,
    ) -> None:
        updated = await repos.compute_targets.release(
            target_id=target.id,
            owning_task_id=owning_task_id,
        )
        if updated is None or updated.status == ComputeTargetStatus.CLAIMED:
            return
        released.append(updated)
        release_reasons[updated.id] = reason
        logfire.info(
            "released orphan compute target {target_id} ({reason})",
            target_id=target.id,
            reason=reason,
        )

    for target in await repos.compute_targets.list_claimed():
        task_id = target.claimed_by_task_id
        if task_id is None:
            await release_target(target, reason="no_claimant")
            continue
        task = await repos.tasks.get(task_id=task_id)
        terminal = {TaskStatus.DONE, TaskStatus.FAILED, TaskStatus.CANCELED}
        if task is None or task.status in terminal:
            await release_target(
                target,
                reason="task_terminal",
                owning_task_id=task_id,
            )
            continue
        if task.workflow_id is None:
            await release_target(
                target,
                reason="no_workflow_id",
                owning_task_id=task_id,
            )
            continue
        if await _task_lease_is_stale(
            repos=repos,
            target=target,
            task=task,
            now=now,
        ):
            await _fail_stale_leasing_task(repos=repos, target=target, task=task)
            await release_target(
                target,
                reason="stale_in_progress_no_recent_receipts",
                owning_task_id=task_id,
            )
    if released:
        for target in released:
            await record_event(
                repos,
                event_type="compute_target.released",
                message=f"Released orphan compute target {target.id}",
                payload={
                    "target_id": target.id,
                    "pool": target.pool,
                    "reason": release_reasons.get(target.id, "orphan_recovery"),
                },
            )
    return released


async def _task_lease_is_stale(
    *,
    repos: Repositories,
    target: ComputeTargetRecord,
    task: TaskRecord,
    now: datetime,
) -> bool:
    if task.status != TaskStatus.IN_PROGRESS:
        return False
    started = (
        _parse_timestamp(target.claimed_at)
        or _parse_timestamp(task.claimed_at)
        or _parse_timestamp(task.updated_at)
    )
    if started is None:
        return False
    lease_age = (now - started).total_seconds()
    if lease_age < DEFAULTS.compute_stale_lease_seconds:
        return False

    receipt = await repos.artifacts.latest_command_receipt_for_task(task_id=task.id)
    if receipt is None:
        return True
    receipt_created = _parse_timestamp(receipt.created_at)
    if receipt_created is None:
        return False
    receipt_age = (now - receipt_created).total_seconds()
    return receipt_age >= DEFAULTS.compute_stale_receipt_grace_seconds


async def _fail_stale_leasing_task(
    *,
    repos: Repositories,
    target: ComputeTargetRecord,
    task: TaskRecord,
) -> None:
    summary = (
        f"Task failed because compute lease {target.id} was stale: the task "
        "remained in progress with a workflow id and no recent command receipt."
    )
    payload = {
        **task.payload,
        "last_infrastructure_failure": {
            "kind": "stale_compute_lease",
            "target_id": target.id,
            "workflow_id": task.workflow_id,
        },
    }
    session_id = task.claimed_in_session_id or task.created_in_session_id
    if session_id is None:
        await repos.tasks.update(
            task_id=task.id,
            status=TaskStatus.FAILED,
            payload=payload,
            result_summary=summary,
        )
        return

    from .claim import finish_task

    await repos.tasks.update(task_id=task.id, payload=payload)
    await finish_task(
        repos=repos,
        task=task,
        session_id=session_id,
        status=TaskStatus.FAILED,
        result_summary=summary,
        force_terminal_update=True,
    )
    await fail_owned_evidence_records_for_task(
        repos=repos,
        task=task,
        session_id=session_id,
        reason=summary,
    )


def _parse_timestamp(value: str | None) -> datetime | None:
    if not value:
        return None
    try:
        parsed = datetime.fromisoformat(value)
    except ValueError:
        return None
    if parsed.tzinfo is None:
        return parsed.replace(tzinfo=timezone.utc)
    return parsed


async def claim_compute_target(
    repos: Repositories,
    *,
    task: TaskRecord,
    session_id: str,
    project_id: str,
) -> tuple[ComputeTargetRecord | None, str, bool]:
    """Try to claim a compute target for the task's declared pool.

    Returns `(target, pool, pool_known)`. `target` is None when no idle target
    is available. `pool_known` is True when at least one non-dead target is
    registered for the pool.
    """
    pool = task_compute_pool(task)
    pool_known = await repos.compute_targets.pool_exists(pool=pool)
    if not pool_known:
        return None, pool, False
    target = await repos.compute_targets.claim_for_pool(
        pool=pool,
        task_id=task.id,
    )
    if target is not None:
        event = await record_event(
            repos,
            event_type="compute_target.claimed",
            message=f"Compute target {target.id} leased to task {task.id}",
            session_id=session_id,
            project_id=project_id,
            payload={
                "target_id": target.id,
                "pool": target.pool,
                "task_id": task.id,
            },
        )
        await publish_record(repos=repos, project_id=project_id, record=target, cursor=event.id)
    return target, pool, True


async def release_compute_target(
    repos: Repositories,
    *,
    target_id: str,
    task_id: str,
    session_id: str,
    project_id: str,
) -> ComputeTargetRecord | None:
    released = await repos.compute_targets.release(
        target_id=target_id,
        owning_task_id=task_id,
    )
    if released is None:
        return None
    if released.status == ComputeTargetStatus.CLAIMED:
        # The release was a no-op (different owner or already-claimed).
        return released
    event = await record_event(
        repos,
        event_type="compute_target.released",
        message=f"Compute target {target_id} released",
        session_id=session_id,
        project_id=project_id,
        payload={
            "target_id": target_id,
            "pool": released.pool,
            "task_id": task_id,
        },
    )
    await publish_record(repos=repos, project_id=project_id, record=released, cursor=event.id)
    return released


async def record_compute_wait(
    repos: Repositories,
    *,
    task: TaskRecord,
    session_id: str,
    project_id: str,
    pool: str,
    pool_known: bool,
) -> None:
    """Record a deduped wait state on the task and emit one event per state shift.

    The first wait for a given (pool, pool_known) pair inserts a fresh
    `awaiting_compute` activity. Subsequent retries with the same pool state
    update that activity's payload (attempt counter, last waited timestamp)
    instead of spawning new rows. A change in pool or pool_known closes the
    existing activity and opens a new one.

    Events are emitted on first wait and on state transitions only; repeated
    same-state attempts are silent at the event log.
    """
    activities = await repos.task_activities.list_for_task(task_id=task.id)
    open_activity = None
    for activity in reversed(activities):
        if activity.payload.get("activity_type") != AWAITING_COMPUTE_ACTIVITY_TYPE:
            continue
        if activity.payload.get("closed"):
            continue
        open_activity = activity
        break

    now = utc_now()
    state_changed = (
        open_activity is None
        or open_activity.payload.get("pool") != pool
        or open_activity.payload.get("pool_known") != pool_known
    )

    if open_activity is not None and state_changed:
        # Close the prior activity before opening a new one.
        closed_payload = {**open_activity.payload, "closed": True, "closed_at": now}
        await repos.task_activities.update_payload(
            activity_id=open_activity.id,
            payload=closed_payload,
        )

    if state_changed:
        event_type = (
            "task.compute_pool_unknown" if not pool_known else "task.waiting_for_compute"
        )
        message = (
            f"Task {task.id} waiting on unknown compute pool {pool!r}"
            if not pool_known
            else f"Task {task.id} waiting on busy compute pool {pool!r}"
        )
        await record_event(
            repos,
            event_type=event_type,
            message=message,
            session_id=session_id,
            project_id=project_id,
            payload={
                "task_id": task.id,
                "pool": pool,
                "pool_known": pool_known,
            },
        )
        await repos.task_activities.add(
            project_id=project_id,
            task_id=task.id,
            created_in_session_id=session_id,
            actor="system",
            kind="comment",
            body=(
                f"Awaiting compute on pool {pool!r}: "
                + ("pool not registered." if not pool_known else "all targets busy.")
            ),
            payload={
                "activity_type": AWAITING_COMPUTE_ACTIVITY_TYPE,
                "pool": pool,
                "pool_known": pool_known,
                "attempt": 1,
                "first_waited_at": now,
                "last_waited_at": now,
            },
        )
        return

    # Same wait state — refresh the existing activity in place.
    assert open_activity is not None
    next_attempt = int(open_activity.payload.get("attempt", 1)) + 1
    await repos.task_activities.update_payload(
        activity_id=open_activity.id,
        payload={
            **open_activity.payload,
            "attempt": next_attempt,
            "last_waited_at": now,
        },
    )


async def close_awaiting_compute_activities(
    repos: Repositories,
    *,
    task_id: str,
) -> None:
    """Close any open awaiting_compute activity once the task gets compute.

    Called right after a successful claim so the wait state is bounded in the
    activity timeline; the task transitions out of awaiting_compute and into
    actual work.
    """
    activities = await repos.task_activities.list_for_task(task_id=task_id)
    now = utc_now()
    for activity in reversed(activities):
        if activity.payload.get("activity_type") != AWAITING_COMPUTE_ACTIVITY_TYPE:
            continue
        if activity.payload.get("closed"):
            continue
        await repos.task_activities.update_payload(
            activity_id=activity.id,
            payload={**activity.payload, "closed": True, "closed_at": now},
        )
