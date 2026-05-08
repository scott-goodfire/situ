"""DBOS queues + per-role task workflows.

Each Situ task row gets one durable workflow. The workflow claims the task,
runs the appropriate `DBOSAgent`, persists message history, marks the task
done, fans out follow-up tasks, and runs a "last one out closes the session"
finalizer.

This module must be imported before `launch_dbos()` so the queues and
`@DBOS.workflow` functions are registered.
"""
from __future__ import annotations

from collections.abc import Awaitable, Callable
from dataclasses import dataclass
from datetime import datetime, timedelta, timezone
import logfire
from dbos import DBOS, Queue, SetEnqueueOptions, SetWorkflowID
from pathlib import Path
from typing import Any

from ...config import DEFAULTS
from ...records import (
    AgentKind,
    AgentStatus,
    ProjectStatus,
    SessionStatus,
    TaskKind,
    TaskRecord,
    TaskStatus,
    WorkItemPurpose,
    WorkItemStatus,
)
from ...repositories import Repositories
from ..critic_review import (
    claim_critic_review_work_item,
    critic_review_drain_token,
    critic_review_target_label,
    fail_critic_review_work_item,
    finish_critic_review_work_item,
    has_pending_critic_records,
    sync_critic_review_work_items,
)
from ..db import Database
from ..observability import set_current_span_attributes, set_current_span_level, span
from ..project_context import ProjectContext
from ..task_execution import (
    PLAN_TASK_TITLE,
    capture_experiment_task_result,
    claim_compute_target,
    claim_task,
    close_awaiting_compute_activities,
    compute_target_execution_env,
    compute_wait_backoff_seconds,
    create_plan_task,
    experiment_task_hypothesis_ids,
    fail_owned_evidence_records_for_task,
    finish_task,
    list_open_evidence_records,
    prepare_experiment_task,
    publish_record,
    record_compute_wait,
    record_event,
    record_selected_patch_handoff,
    release_compute_target,
    release_orphan_leases,
    task_compute_pool,
    TaskStatusSnapshot,
    capture_task_status_snapshot,
    validate_task_status_progress,
)

_MANAGER_QUEUE_NAME = "situ-manager"
_CRITIC_REVIEW_QUEUE_NAME = "situ-critic-review"
_RESEARCHER_QUEUE_NAME = "situ-researcher"
_SCIENTIST_QUEUE_NAME = "situ-scientist"
_TASK_DISPATCH_CRON = f"*/{DEFAULTS.task_dispatch_interval_seconds} * * * * *"
_SCHEDULER_TICK_WORKFLOW_NAME = "situ.task.scheduler_tick"
_FAILED_WORKFLOW_STATUSES = {
    "ERROR",
    "CANCELLED",
    "CANCELED",
    "MAX_RECOVERY_ATTEMPTS_EXCEEDED",
}
_WORKFLOW_FAILURE_SUMMARY_LIMIT = 1_200
_WORKFLOW_CLAIM_TIMEOUT_SECONDS = DEFAULTS.task_workflow_claim_timeout_seconds
_IN_PROGRESS_WORKFLOW_STALL_SECONDS = int(DEFAULTS.agent_workflow_timeout_seconds)
_WORKFLOW_STUCK_STATUSES = {"PENDING"}
_TERMINAL_WORKFLOW_STATUSES = _FAILED_WORKFLOW_STATUSES | {"SUCCESS"}
_INFRASTRUCTURE_FAILURE_EVENT_TYPES = ("task.workflow_failed", "task.workflow_stuck")
_CRITIC_REVIEW_MAX_ATTEMPTS = 4
_CRITIC_REVIEW_BACKOFF_SECONDS = (5, 15, 45)
_CRITIC_REVIEW_WORK_ITEM_LEASE_SECONDS = int(DEFAULTS.agent_workflow_timeout_seconds)
_RETRYABLE_CRITIC_STATUS_CODES = {408, 409, 429, 500, 502, 503, 504}

_manager_queue: Queue | None = None
_critic_review_queue: Queue | None = None
_researcher_queue: Queue | None = None
_scientist_queue: Queue | None = None
_task_dispatch_home: Path | None = None

_DISPATCHABLE_TASK_KINDS: tuple[TaskKind, ...] = (
    TaskKind.PLAN,
    TaskKind.RESEARCH,
    TaskKind.HYPOTHESIZE,
    TaskKind.INTERPRET,
    TaskKind.BASELINE,
    TaskKind.EXPERIMENT,
)


@dataclass(frozen=True, slots=True)
class AgentPassFinish:
    ok: bool
    summary: str


def configure_task_dispatch_home(home: Path) -> None:
    """Set the install state home used by the DBOS dispatch sweep."""
    global _task_dispatch_home
    _task_dispatch_home = home.expanduser()


def register_queues() -> None:
    """Idempotently register the four agent queues. Must run before launch_dbos()."""
    global _manager_queue, _critic_review_queue, _researcher_queue, _scientist_queue
    if _manager_queue is not None:
        return
    _manager_queue = Queue(
        _MANAGER_QUEUE_NAME,
        concurrency=1,
        partition_queue=True,
    )
    _critic_review_queue = Queue(
        _CRITIC_REVIEW_QUEUE_NAME,
        concurrency=DEFAULTS.critic_review_queue_concurrency,
        partition_queue=True,
    )
    _researcher_queue = Queue(
        _RESEARCHER_QUEUE_NAME,
        concurrency=DEFAULTS.researcher_queue_concurrency,
        partition_queue=True,
    )
    _scientist_queue = Queue(
        _SCIENTIST_QUEUE_NAME,
        concurrency=DEFAULTS.scientist_queue_concurrency,
        partition_queue=True,
    )


def _queue_for_kind(kind: TaskKind) -> Queue:
    if _manager_queue is None or _researcher_queue is None or _scientist_queue is None:
        raise RuntimeError("DBOS queues not registered; call register_queues() before enqueue")
    if kind == TaskKind.PLAN:
        return _manager_queue
    if kind in (TaskKind.RESEARCH, TaskKind.HYPOTHESIZE, TaskKind.INTERPRET):
        return _researcher_queue
    if kind in (TaskKind.BASELINE, TaskKind.EXPERIMENT):
        return _scientist_queue
    raise ValueError(f"no queue mapping for task kind {kind!r}")


def _queue_name_for_kind(kind: TaskKind) -> str:
    if kind == TaskKind.PLAN:
        return _MANAGER_QUEUE_NAME
    if kind in (TaskKind.RESEARCH, TaskKind.HYPOTHESIZE, TaskKind.INTERPRET):
        return _RESEARCHER_QUEUE_NAME
    if kind in (TaskKind.BASELINE, TaskKind.EXPERIMENT):
        return _SCIENTIST_QUEUE_NAME
    raise ValueError(f"no queue mapping for task kind {kind!r}")


def _workflow_for_kind(kind: TaskKind):
    if kind == TaskKind.PLAN:
        return run_manager_workflow
    if kind in (TaskKind.RESEARCH, TaskKind.HYPOTHESIZE, TaskKind.INTERPRET):
        return run_researcher_workflow
    if kind in (TaskKind.BASELINE, TaskKind.EXPERIMENT):
        return run_scientist_workflow
    raise ValueError(f"no workflow mapping for task kind {kind!r}")


def _workflow_name_for_kind(kind: TaskKind) -> str:
    if kind == TaskKind.PLAN:
        return "situ.task.run_manager"
    if kind in (TaskKind.RESEARCH, TaskKind.HYPOTHESIZE, TaskKind.INTERPRET):
        return "situ.task.run_researcher"
    if kind in (TaskKind.BASELINE, TaskKind.EXPERIMENT):
        return "situ.task.run_scientist"
    raise ValueError(f"no workflow mapping for task kind {kind!r}")


def _current_workflow_id() -> str | None:
    workflow_id = getattr(DBOS, "workflow_id", None)
    return str(workflow_id) if workflow_id is not None else None


def task_workflow_id(task_id: str, *, attempt: int = 1) -> str:
    return f"task:{task_id}:a{attempt}"


def task_compute_attempt(task: TaskRecord) -> int:
    raw = task.payload.get("compute_attempt", 1)
    try:
        attempt = int(raw)
    except (TypeError, ValueError):
        return 1
    return max(attempt, 1)


def critic_review_workflow_id(
    *,
    session_id: str,
    trigger_id: str,
) -> str:
    return f"critic-review:{session_id}:{trigger_id}"


async def enqueue_task(
    *,
    repos: Repositories,
    task: TaskRecord,
    session_id: str,
    project_id: str,
    workspace_root: str,
    home: str | None = None,
    app_root: str | None = None,
) -> bool:
    """Enqueue a task onto its DBOS queue and stamp the workflow_id on the row.

    The workflow id encodes the task's `compute_attempt` counter so retries
    after a no-capacity wait get a fresh DBOS workflow id and never collide
    with a prior attempt.
    """
    queue = _queue_for_kind(task.kind)
    workflow = _workflow_for_kind(task.kind)
    queue_name = _queue_name_for_kind(task.kind)
    workflow_name = _workflow_name_for_kind(task.kind)
    attempt = task_compute_attempt(task)
    workflow_id = task_workflow_id(task.id, attempt=attempt)
    reserved = await repos.tasks.try_set_workflow_id(
        task_id=task.id,
        workflow_id=workflow_id,
    )
    if not reserved:
        return False
    try:
        with span(
            "situ.task.enqueue",
            task_id=task.id,
            task_kind=task.kind.value,
            project_id=project_id,
            session_id=session_id,
            workflow_id=workflow_id,
            workflow_name=workflow_name,
            queue_name=queue_name,
            workspace_root=workspace_root,
        ):
            with SetWorkflowID(workflow_id):
                with SetEnqueueOptions(queue_partition_key=project_id):
                    await queue.enqueue_async(
                        func=workflow,
                        task_id=task.id,
                        session_id=session_id,
                        project_id=project_id,
                        workspace_root=workspace_root,
                        home=home,
                        app_root=app_root,
                    )
    except Exception:
        await repos.tasks.set_workflow_id(task_id=task.id, workflow_id=None)
        raise
    return True


async def enqueue_critic_review(
    *,
    session_id: str,
    project_id: str,
    trigger_id: str,
    workspace_root: str,
    home: str | None = None,
    app_root: str | None = None,
) -> None:
    if _critic_review_queue is None:
        raise RuntimeError("DBOS queues not registered; call register_queues() before enqueue")
    workflow_id = critic_review_workflow_id(
        session_id=session_id,
        trigger_id=trigger_id,
    )
    with span(
        "situ.critic_review.enqueue",
        session_id=session_id,
        project_id=project_id,
        trigger_id=trigger_id,
        workflow_id=workflow_id,
        workflow_name="situ.critic.review",
        queue_name=_CRITIC_REVIEW_QUEUE_NAME,
        workspace_root=workspace_root,
    ):
        with SetWorkflowID(workflow_id):
            with SetEnqueueOptions(queue_partition_key=project_id):
                await _critic_review_queue.enqueue_async(
                    func=run_critic_review_workflow,
                    session_id=session_id,
                    project_id=project_id,
                    workspace_root=workspace_root,
                    home=home,
                    app_root=app_root,
                )


async def enqueue_ready_critic_reviews(
    *,
    repos: Repositories,
    session_id: str,
    project_id: str,
    trigger_id: str,
    workspace_root: str,
    home: str | None = None,
    app_root: str | None = None,
    limit: int | None = None,
) -> int:
    resolved_limit = (
        DEFAULTS.critic_review_queue_concurrency if limit is None else limit
    )
    await repos.work_items.release_expired_claims(
        project_id=project_id,
        purpose=WorkItemPurpose.CRITIC_REVIEW,
    )
    ready_items = await repos.work_items.list_ready_for_project(
        project_id=project_id,
        purpose=WorkItemPurpose.CRITIC_REVIEW,
        limit=max(resolved_limit, 0),
    )
    enqueued = 0
    for item in ready_items:
        item_trigger_id = trigger_id if enqueued == 0 else f"{trigger_id}:{item.id}"
        await enqueue_critic_review(
            session_id=session_id,
            project_id=project_id,
            trigger_id=item_trigger_id,
            workspace_root=workspace_root,
            home=home,
            app_root=app_root,
        )
        enqueued += 1
    return enqueued


async def cancel_session_workflows(
    repos: Repositories,
    *,
    session_id: str,
    exclude_workflow_id: str | None = None,
) -> None:
    in_progress = await repos.tasks.list_in_progress_for_session(session_id=session_id)
    workflow_ids = [
        task.workflow_id
        for task in in_progress
        if task.workflow_id is not None and task.workflow_id != exclude_workflow_id
    ]
    if not workflow_ids:
        return
    try:
        await DBOS.cancel_workflows_async(workflow_ids)
    except Exception as error:
        logfire.warning(
            "could not cancel session workflows session={session_id} "
            "workflow_ids={workflow_ids} error={error}",
            session_id=session_id,
            workflow_ids=workflow_ids,
            error=str(error),
        )


async def recover_orphan_tasks(
    repos: Repositories,
    *,
    project_id: str,
    session_id: str,
    workspace_root: str,
    home: str | None = None,
    app_root: str | None = None,
) -> int:
    """Compatibility wrapper for the runnable task dispatcher."""
    return await dispatch_runnable_tasks(
        repos=repos,
        project_id=project_id,
        session_id=session_id,
        workspace_root=workspace_root,
        home=home,
        app_root=app_root,
    )


async def dispatch_runnable_tasks(
    *,
    repos: Repositories,
    project_id: str | None = None,
    session_id: str | None = None,
    workspace_root: str | None = None,
    home: str | None = None,
    app_root: str | None = None,
    limit: int | None = None,
) -> int:
    """Enqueue runnable BACKLOG tasks whose workflow_id is empty.

    This is the single retry path for parked compute waiters and the recovery
    path for Manager-created tasks. It relies on DBOS workflow ids for enqueue
    idempotency and on task claiming for execution idempotency.
    """
    tasks = await repos.tasks.list_dispatchable(
        project_id=project_id,
        session_id=session_id,
        eligible_kinds=_DISPATCHABLE_TASK_KINDS,
        limit=limit,
    )
    enqueued = 0
    scientist_capacity_by_pool: dict[str, tuple[int, bool]] = {}
    scientist_reserved_by_pool: dict[str, int] = {}
    for task in tasks:
        task_session_id = task.created_in_session_id
        if task_session_id is None:
            continue
        session = await repos.sessions.get(session_id=task_session_id)
        if session is None or session.status != SessionStatus.ACTIVE:
            continue
        project = await repos.projects.get(project_id=task.project_id)
        if project is None or project.status != ProjectStatus.ACTIVE:
            continue
        workspace = await repos.workspaces.get(workspace_id=project.workspace_id)
        if workspace is None:
            continue
        if task.kind in (TaskKind.BASELINE, TaskKind.EXPERIMENT):
            should_enqueue = await _reserve_scientist_dispatch_capacity(
                repos=repos,
                task=task,
                session_id=session.id,
                project_id=task.project_id,
                capacity_by_pool=scientist_capacity_by_pool,
                reserved_by_pool=scientist_reserved_by_pool,
            )
            if not should_enqueue:
                continue
        did_enqueue = await enqueue_task(
            repos=repos,
            task=task,
            session_id=session.id,
            project_id=task.project_id,
            workspace_root=workspace_root or workspace.repo_path,
            home=home,
            app_root=app_root,
        )
        if did_enqueue:
            enqueued += 1
    return enqueued


async def _reserve_scientist_dispatch_capacity(
    *,
    repos: Repositories,
    task: TaskRecord,
    session_id: str,
    project_id: str,
    capacity_by_pool: dict[str, tuple[int, bool]],
    reserved_by_pool: dict[str, int],
) -> bool:
    """Avoid spawning Scientist workflows when no compute slot can run them."""
    pool = task_compute_pool(task)
    if pool not in capacity_by_pool:
        pool_known = await repos.compute_targets.pool_exists(pool=pool)
        idle_count = (
            await repos.compute_targets.count_idle_for_pool(pool=pool)
            if pool_known
            else 0
        )
        capacity_by_pool[pool] = (idle_count, pool_known)

    idle_count, pool_known = capacity_by_pool[pool]
    reserved = reserved_by_pool.get(pool, 0)
    if reserved < idle_count:
        reserved_by_pool[pool] = reserved + 1
        return True

    await record_compute_wait(
        repos,
        task=task,
        session_id=session_id,
        project_id=project_id,
        pool=pool,
        pool_known=pool_known,
    )
    await _park_for_compute(repos=repos, task=task)
    return False


async def _park_for_compute(
    *,
    repos: Repositories,
    task: TaskRecord,
) -> None:
    """Park a Scientist task until the dispatch sweep retries it."""
    current_attempt = task_compute_attempt(task)
    next_attempt = current_attempt + 1
    backoff_seconds = compute_wait_backoff_seconds(current_attempt)
    available_at = _utc_now_offset_iso(backoff_seconds)
    payload = {
        **task.payload,
        "compute_attempt": next_attempt,
        "last_compute_wait_backoff_seconds": backoff_seconds,
    }
    refreshed = await repos.tasks.requeue(
        task_id=task.id,
        payload=payload,
        available_at=available_at,
    )
    if refreshed is None:
        return
    if task.assignee_id is not None:
        await repos.agents.update(agent_id=task.assignee_id, status=AgentStatus.IDLE)


async def surface_failed_task_workflows(
    *,
    repos: Repositories,
    workflow_status_getter: Callable[[str], Awaitable[Any]] | None = None,
    limit: int = 100,
) -> int:
    """Make terminal DBOS workflow failures visible in task state."""
    get_status = workflow_status_getter or DBOS.get_workflow_status_async
    surfaced = 0
    for task in await repos.tasks.list_nonterminal_with_workflow_id(limit=limit):
        if task.workflow_id is None:
            continue
        try:
            status = await get_status(task.workflow_id)
        except Exception as error:
            logfire.warning(
                "could not inspect task workflow task={task} workflow={workflow} error={error}",
                task=task.id,
                workflow=task.workflow_id,
                error=str(error),
            )
            continue
        status_value = _workflow_status_value(status)
        if status_value not in _FAILED_WORKFLOW_STATUSES:
            continue
        await _fail_task_for_workflow_status(
            repos=repos,
            task=task,
            workflow_status=status,
            workflow_status_value=status_value,
        )
        surfaced += 1
    return surfaced


async def surface_stuck_unclaimed_task_workflows(
    *,
    repos: Repositories,
    workflow_status_getter: Callable[[str], Awaitable[Any]] | None = None,
    timeout_seconds: int = _WORKFLOW_CLAIM_TIMEOUT_SECONDS,
    limit: int = 100,
) -> int:
    """Fail tasks whose DBOS workflow started but never claimed the row."""
    get_status = workflow_status_getter or DBOS.get_workflow_status_async
    now = datetime.now(timezone.utc)
    surfaced = 0
    for task in await repos.tasks.list_backlog_with_workflow_id(limit=limit):
        if task.workflow_id is None:
            continue
        age_seconds = (now - _parse_timestamp(task.updated_at)).total_seconds()
        if age_seconds < timeout_seconds:
            continue
        try:
            status = await get_status(task.workflow_id)
        except Exception as error:
            logfire.warning(
                "could not inspect unclaimed task workflow task={task} "
                "workflow={workflow} error={error}",
                task=task.id,
                workflow=task.workflow_id,
                error=str(error),
            )
            continue
        status_value = _workflow_status_value(status)
        if status_value in _FAILED_WORKFLOW_STATUSES:
            await _fail_task_for_workflow_status(
                repos=repos,
                task=task,
                workflow_status=status,
                workflow_status_value=status_value,
            )
            surfaced += 1
            continue
        if status_value not in _WORKFLOW_STUCK_STATUSES:
            continue
        await _fail_task_for_unclaimed_workflow(
            repos=repos,
            task=task,
            workflow_status=status,
            workflow_status_value=status_value,
            age_seconds=age_seconds,
        )
        surfaced += 1
    return surfaced


async def surface_stuck_in_progress_task_workflows(
    *,
    repos: Repositories,
    workflow_status_getter: Callable[[str], Awaitable[Any]] | None = None,
    timeout_seconds: int = _IN_PROGRESS_WORKFLOW_STALL_SECONDS,
    limit: int = 100,
) -> int:
    """Fail claimed tasks whose workflow stays pending past the agent timeout."""
    get_status = workflow_status_getter or DBOS.get_workflow_status_async
    now = datetime.now(timezone.utc)
    surfaced = 0
    for task in await repos.tasks.list_nonterminal_with_workflow_id(limit=limit):
        if task.status != TaskStatus.IN_PROGRESS or task.workflow_id is None:
            continue
        started_at = task.claimed_at or task.updated_at
        age_seconds = (now - _parse_timestamp(started_at)).total_seconds()
        if age_seconds < timeout_seconds:
            continue
        try:
            status = await get_status(task.workflow_id)
        except Exception as error:
            logfire.warning(
                "could not inspect in-progress task workflow task={task} "
                "workflow={workflow} error={error}",
                task=task.id,
                workflow=task.workflow_id,
                error=str(error),
            )
            continue
        status_value = _workflow_status_value(status)
        if status_value in _FAILED_WORKFLOW_STATUSES:
            await _fail_task_for_workflow_status(
                repos=repos,
                task=task,
                workflow_status=status,
                workflow_status_value=status_value,
            )
            surfaced += 1
            continue
        if status_value not in _WORKFLOW_STUCK_STATUSES:
            continue
        await _fail_task_for_stalled_in_progress_workflow(
            repos=repos,
            task=task,
            workflow_status=status,
            workflow_status_value=status_value,
            age_seconds=age_seconds,
        )
        surfaced += 1
    return surfaced


async def recover_stalled_critic_reviews(
    *,
    repos: Repositories,
    home: str | None = None,
    app_root: str | None = None,
    workflow_lister: Callable[[str], Awaitable[list[Any]]] | None = None,
    limit: int = 100,
) -> int:
    """Re-enqueue active sessions wedged on pending review records."""
    list_workflows = workflow_lister or _list_workflows_by_prefix
    recovered = 0
    for session in await repos.sessions.list_all():
        if recovered >= limit:
            break
        if session.status != SessionStatus.ACTIVE or session.project_id is None:
            continue
        project = await repos.projects.get(project_id=session.project_id)
        if project is None or project.status != ProjectStatus.ACTIVE:
            continue
        review_work_items = await sync_critic_review_work_items(
            repos=repos,
            project_id=project.id,
            session_id=session.id,
        )
        if not review_work_items:
            continue
        if await repos.tasks.count_in_progress_for_session(session_id=session.id) > 0:
            continue
        if await repos.tasks.count_backlog_for_project(project_id=project.id) > 0:
            continue
        workflows = await list_workflows(_critic_review_workflow_prefix(session.id))
        if _has_live_workflow(workflows):
            continue
        workspace = await repos.workspaces.get(workspace_id=session.workspace_id)
        if workspace is None:
            continue
        trigger_id = _critic_review_recovery_trigger_id(
            workflows=workflows,
        )
        workflow_id = critic_review_workflow_id(
            session_id=session.id,
            trigger_id=trigger_id,
        )
        enqueued = await enqueue_ready_critic_reviews(
            repos=repos,
            session_id=session.id,
            project_id=project.id,
            trigger_id=trigger_id,
            workspace_root=workspace.repo_path,
            home=home,
            app_root=app_root,
        )
        if enqueued == 0:
            continue
        await record_event(
            repos=repos,
            event_type="session.critic_recovery_enqueued",
            message=(
                "Re-enqueued Critic review for pending review records after "
                "no live Critic workflow was found."
            ),
            session_id=session.id,
            project_id=project.id,
            payload={
                "workflow_id": workflow_id,
                "trigger_id": trigger_id,
                "enqueued_count": enqueued,
                "prior_workflow_count": len(workflows),
            },
        )
        recovered += 1
    return recovered


async def _fail_task_for_workflow_status(
    *,
    repos: Repositories,
    task: TaskRecord,
    workflow_status: Any,
    workflow_status_value: str,
) -> None:
    payload = _infrastructure_failure_payload(
        task=task,
        failure_kind="workflow_failed",
        workflow_status_value=workflow_status_value,
    )
    session_id = task.created_in_session_id
    if session_id is None:
        await repos.tasks.update(
            task_id=task.id,
            status=TaskStatus.FAILED,
            result_summary=_workflow_failure_summary(
                task=task,
                workflow_status=workflow_status,
                workflow_status_value=workflow_status_value,
            ),
            payload=payload,
        )
        return

    summary = _workflow_failure_summary(
        task=task,
        workflow_status=workflow_status,
        workflow_status_value=workflow_status_value,
    )
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
    for target in await repos.compute_targets.list_claimed():
        if target.claimed_by_task_id != task.id:
            continue
        await release_compute_target(
            repos=repos,
            target_id=target.id,
            task_id=task.id,
            session_id=session_id,
            project_id=task.project_id,
        )
    await record_event(
        repos=repos,
        event_type="task.workflow_failed",
        message=f"Workflow {task.workflow_id} failed for task {task.id}",
        session_id=session_id,
        project_id=task.project_id,
        payload={
            "task_id": task.id,
            "workflow_id": task.workflow_id,
            "workflow_name": getattr(workflow_status, "name", None),
            "workflow_status": workflow_status_value,
            "error": _workflow_error_text(workflow_status),
            "failure_kind": "workflow_failed",
            "infrastructure_retry_count": payload["infrastructure_retry_count"],
        },
    )
    if await _close_if_scheduler_unhealthy(
        repos=repos,
        session_id=session_id,
        project_id=task.project_id,
    ):
        return
    await _maybe_close_session(
        repos=repos,
        session_id=session_id,
        project_id=task.project_id,
    )


async def _fail_task_for_unclaimed_workflow(
    *,
    repos: Repositories,
    task: TaskRecord,
    workflow_status: Any,
    workflow_status_value: str,
    age_seconds: float,
) -> None:
    payload = _infrastructure_failure_payload(
        task=task,
        failure_kind="workflow_unclaimed",
        workflow_status_value=workflow_status_value,
        age_seconds=age_seconds,
    )
    session_id = task.created_in_session_id
    if session_id is None:
        await repos.tasks.update(
            task_id=task.id,
            status=TaskStatus.FAILED,
            result_summary=_unclaimed_workflow_summary(
                task=task,
                workflow_status=workflow_status,
                workflow_status_value=workflow_status_value,
                age_seconds=age_seconds,
            ),
            payload=payload,
        )
        return

    summary = _unclaimed_workflow_summary(
        task=task,
        workflow_status=workflow_status,
        workflow_status_value=workflow_status_value,
        age_seconds=age_seconds,
    )
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
    await record_event(
        repos=repos,
        event_type="task.workflow_stuck",
        message=f"Workflow {task.workflow_id} did not claim task {task.id}",
        session_id=session_id,
        project_id=task.project_id,
        payload={
            "task_id": task.id,
            "workflow_id": task.workflow_id,
            "workflow_name": getattr(workflow_status, "name", None),
            "workflow_status": workflow_status_value,
            "age_seconds": age_seconds,
            "failure_kind": "workflow_unclaimed",
            "infrastructure_retry_count": payload["infrastructure_retry_count"],
        },
    )
    if await _close_if_scheduler_unhealthy(
        repos=repos,
        session_id=session_id,
        project_id=task.project_id,
    ):
        return
    await _maybe_close_session(
        repos=repos,
        session_id=session_id,
        project_id=task.project_id,
    )


async def _fail_task_for_stalled_in_progress_workflow(
    *,
    repos: Repositories,
    task: TaskRecord,
    workflow_status: Any,
    workflow_status_value: str,
    age_seconds: float,
) -> None:
    payload = _infrastructure_failure_payload(
        task=task,
        failure_kind="workflow_in_progress_stalled",
        workflow_status_value=workflow_status_value,
        age_seconds=age_seconds,
    )
    session_id = task.claimed_in_session_id or task.created_in_session_id
    if session_id is None:
        await repos.tasks.update(
            task_id=task.id,
            status=TaskStatus.FAILED,
            result_summary=_stalled_in_progress_workflow_summary(
                task=task,
                workflow_status=workflow_status,
                workflow_status_value=workflow_status_value,
                age_seconds=age_seconds,
            ),
            payload=payload,
        )
        return

    summary = _stalled_in_progress_workflow_summary(
        task=task,
        workflow_status=workflow_status,
        workflow_status_value=workflow_status_value,
        age_seconds=age_seconds,
    )
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
    for target in await repos.compute_targets.list_claimed():
        if target.claimed_by_task_id != task.id:
            continue
        await release_compute_target(
            repos=repos,
            target_id=target.id,
            task_id=task.id,
            session_id=session_id,
            project_id=task.project_id,
        )
    await record_event(
        repos=repos,
        event_type="task.workflow_stuck",
        message=f"Workflow {task.workflow_id} stalled while running task {task.id}",
        session_id=session_id,
        project_id=task.project_id,
        payload={
            "task_id": task.id,
            "workflow_id": task.workflow_id,
            "workflow_name": getattr(workflow_status, "name", None),
            "workflow_status": workflow_status_value,
            "age_seconds": age_seconds,
            "failure_kind": "workflow_in_progress_stalled",
            "infrastructure_retry_count": payload["infrastructure_retry_count"],
        },
    )
    if await _close_if_scheduler_unhealthy(
        repos=repos,
        session_id=session_id,
        project_id=task.project_id,
    ):
        return
    await _maybe_close_session(
        repos=repos,
        session_id=session_id,
        project_id=task.project_id,
    )


def _workflow_failure_summary(
    *,
    task: TaskRecord,
    workflow_status: Any,
    workflow_status_value: str,
) -> str:
    error = _workflow_error_text(workflow_status)
    name = getattr(workflow_status, "name", None) or "unknown workflow"
    summary = (
        f"DBOS workflow {task.workflow_id} ({name}) reached "
        f"{workflow_status_value}: {error or 'no error detail'}"
    )
    if len(summary) <= _WORKFLOW_FAILURE_SUMMARY_LIMIT:
        return summary
    return summary[: _WORKFLOW_FAILURE_SUMMARY_LIMIT - 3] + "..."


def _infrastructure_failure_payload(
    *,
    task: TaskRecord,
    failure_kind: str,
    workflow_status_value: str,
    age_seconds: float | None = None,
) -> dict[str, Any]:
    try:
        previous_count = int(task.payload.get("infrastructure_retry_count", 0))
    except (TypeError, ValueError):
        previous_count = 0
    detail: dict[str, Any] = {
        "kind": failure_kind,
        "workflow_id": task.workflow_id,
        "workflow_status": workflow_status_value,
    }
    if age_seconds is not None:
        detail["age_seconds"] = age_seconds
    return {
        **task.payload,
        "infrastructure_retry_count": previous_count + 1,
        "last_infrastructure_failure": detail,
    }


def _unclaimed_workflow_summary(
    *,
    task: TaskRecord,
    workflow_status: Any,
    workflow_status_value: str,
    age_seconds: float,
) -> str:
    name = getattr(workflow_status, "name", None) or "unknown workflow"
    return (
        f"DBOS workflow {task.workflow_id} ({name}) reached {workflow_status_value} "
        f"but did not claim task {task.id} after {age_seconds:.1f}s. This usually "
        "means the DBOS queue worker or workflow event loop is unhealthy; restart "
        "the Situ app and inspect DBOS/app logs."
    )


def _stalled_in_progress_workflow_summary(
    *,
    task: TaskRecord,
    workflow_status: Any,
    workflow_status_value: str,
    age_seconds: float,
) -> str:
    name = getattr(workflow_status, "name", None) or "unknown workflow"
    return (
        f"DBOS workflow {task.workflow_id} ({name}) reached {workflow_status_value} "
        f"while task {task.id} was already in progress for {age_seconds:.1f}s. "
        "This usually means the DBOS worker or nested agent workflow stalled; "
        "restart the Situ app and inspect DBOS/app logs."
    )


def _workflow_status_value(workflow_status: Any) -> str:
    if workflow_status is None:
        return ""
    if isinstance(workflow_status, dict):
        raw_status = workflow_status.get("status", "")
        return str(getattr(raw_status, "value", raw_status))
    raw_status = getattr(workflow_status, "status", "")
    return str(getattr(raw_status, "value", raw_status))


def _workflow_error_text(workflow_status: Any) -> str:
    error = getattr(workflow_status, "error", None)
    if error is None:
        return ""
    return str(error)


async def _list_workflows_by_prefix(prefix: str) -> list[Any]:
    return await DBOS.list_workflows_async(
        workflow_id_prefix=prefix,
        load_input=False,
        load_output=False,
    )


def _has_live_workflow(workflows: list[Any]) -> bool:
    return any(
        _workflow_status_value(workflow) not in _TERMINAL_WORKFLOW_STATUSES
        for workflow in workflows
    )


def _critic_review_workflow_prefix(session_id: str) -> str:
    return f"critic-review:{session_id}:"


def _critic_review_recovery_trigger_id(*, workflows: list[Any]) -> str:
    return f"recovery:{len(workflows) + 1}"


def _retryable_critic_status_code(error: BaseException) -> int | None:
    raw = getattr(error, "status_code", None)
    try:
        return int(raw)
    except (TypeError, ValueError):
        return None


def _is_retryable_critic_error(error: BaseException) -> bool:
    status_code = _retryable_critic_status_code(error)
    return status_code in _RETRYABLE_CRITIC_STATUS_CODES


def _critic_retry_delay_seconds(attempt: int) -> int:
    index = max(0, min(attempt - 1, len(_CRITIC_REVIEW_BACKOFF_SECONDS) - 1))
    return _CRITIC_REVIEW_BACKOFF_SECONDS[index]


def _parse_timestamp(value: str) -> datetime:
    parsed = datetime.fromisoformat(value.replace("Z", "+00:00"))
    if parsed.tzinfo is None:
        return parsed.replace(tzinfo=timezone.utc)
    return parsed.astimezone(timezone.utc)


def _utc_now_offset_iso(seconds: int) -> str:
    from datetime import timedelta

    return (datetime.now(timezone.utc) + timedelta(seconds=seconds)).strftime(
        "%Y-%m-%dT%H:%M:%S.%fZ"
    )


# ---------------------------------------------------------------------------
# workflow context helpers
# ---------------------------------------------------------------------------


async def _open_workflow_context(
    *,
    workspace_root: str,
    home: str | None,
) -> tuple[ProjectContext, Database, Repositories]:
    home_path = Path(home) if home is not None else None
    context = await ProjectContext.create(Path(workspace_root), home=home_path)
    db = await Database.open(
        context.database_path,
        workspace_id=context.workspace_id,
        repo_path=str(context.repo_root),
    )
    repos = Repositories.create(db)
    return context, db, repos


async def _open_install_repos(*, home: Path | None = None) -> Repositories:
    home_path = home or DEFAULTS.local_state_home_path()
    db = await Database.open(
        home_path / "situ.sqlite",
        workspace_id="install",
        repo_path=str(home_path),
    )
    return Repositories.create(db)


@DBOS.scheduled(_TASK_DISPATCH_CRON)
@DBOS.workflow(name=_SCHEDULER_TICK_WORKFLOW_NAME)
async def run_task_dispatch_sweep(
    scheduled_time: datetime,
    actual_time: datetime,
) -> None:
    """Scheduled DBOS sweep that starts runnable task workflows."""
    home = _task_dispatch_home or DEFAULTS.local_state_home_path()
    trace_attrs = {
        "workflow_name": _SCHEDULER_TICK_WORKFLOW_NAME,
        "workflow_id": _current_workflow_id(),
        "scheduled_time": scheduled_time.isoformat(),
        "actual_time": actual_time.isoformat(),
        "home": str(home),
    }
    set_current_span_level("trace")
    set_current_span_attributes(**trace_attrs)
    repos = await _open_install_repos(home=home)
    try:
        with span(
            "situ.task.scheduler_tick.summary",
            _level="trace",
            **trace_attrs,
        ) as tick_span:
            outcome_attrs = await _run_task_dispatch_sweep_once(
                repos=repos,
                home=home,
                app_root=None,
            )
            tick_span.set_attributes(outcome_attrs)
            set_current_span_attributes(**outcome_attrs)
    except Exception as error:
        set_current_span_attributes(scheduler_tick_error=str(error))
        logfire.warning(
            "task dispatch sweep failed error={error}",
            error=str(error),
        )


async def _run_task_dispatch_sweep_once(
    *,
    repos: Repositories,
    home: Path,
    app_root: str | None,
    workflow_status_getter: Callable[[str], Awaitable[Any]] | None = None,
    workflow_lister: Callable[[str], Awaitable[list[Any]]] | None = None,
) -> dict[str, int]:
    released_orphan_leases = await release_orphan_leases(repos)
    failed_workflows_count = await surface_failed_task_workflows(
        repos=repos,
        workflow_status_getter=workflow_status_getter,
    )
    stuck_workflows_count = await surface_stuck_unclaimed_task_workflows(
        repos=repos,
        workflow_status_getter=workflow_status_getter,
    )
    stalled_workflows_count = await surface_stuck_in_progress_task_workflows(
        repos=repos,
        workflow_status_getter=workflow_status_getter,
    )
    enqueued_count = await dispatch_runnable_tasks(
        repos=repos,
        home=str(home),
        app_root=app_root,
    )
    critic_recoveries_count = await recover_stalled_critic_reviews(
        repos=repos,
        home=str(home),
        app_root=app_root,
        workflow_lister=workflow_lister,
    )
    return {
        "orphan_leases_released_count": len(released_orphan_leases),
        "failed_workflows_count": failed_workflows_count,
        "stuck_workflows_count": stuck_workflows_count + stalled_workflows_count,
        "stalled_workflows_count": stalled_workflows_count,
        "enqueued_count": enqueued_count,
        "critic_recoveries_count": critic_recoveries_count,
    }


async def _close_session(
    repos: Repositories,
    *,
    session_id: str,
    event_type: str,
    message: str,
    payload: dict | None = None,
) -> None:
    if event_type == "session.failed":
        await _quiesce_failed_session_work(
            repos=repos,
            session_id=session_id,
            reason=message,
        )
    session = await repos.sessions.update_status(session_id=session_id, status=SessionStatus.CLOSED)
    event = await record_event(
        repos,
        event_type=event_type,
        message=message,
        session_id=session_id,
        project_id=session.project_id if session is not None else None,
        payload=payload,
    )
    if session is not None:
        await publish_record(
            repos=repos,
            project_id=session.project_id or "",
            record=session,
            cursor=event.id,
        )


async def _quiesce_failed_session_work(
    *,
    repos: Repositories,
    session_id: str,
    reason: str,
) -> None:
    current_workflow_id = _current_workflow_id()
    await cancel_session_workflows(
        repos,
        session_id=session_id,
        exclude_workflow_id=current_workflow_id,
    )
    for task in await repos.tasks.list_in_progress_for_session(session_id=session_id):
        summary = f"Task failed because session {session_id} closed: {reason}"
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
        for target in await repos.compute_targets.list_claimed():
            if target.claimed_by_task_id != task.id:
                continue
            await release_compute_target(
                repos=repos,
                target_id=target.id,
                task_id=task.id,
                session_id=session_id,
                project_id=task.project_id,
            )


async def _recent_infrastructure_failure_count(
    *,
    repos: Repositories,
    session_id: str,
) -> int:
    since = (
        datetime.now(timezone.utc)
        - timedelta(seconds=DEFAULTS.scheduler_unhealthy_window_seconds)
    ).isoformat()
    return await repos.events.count_for_session_since(
        session_id=session_id,
        event_types=_INFRASTRUCTURE_FAILURE_EVENT_TYPES,
        since=since,
    )


async def _close_session_for_scheduler_unhealthy(
    *,
    repos: Repositories,
    session_id: str,
    project_id: str,
    failure_count: int,
    reason: str,
) -> None:
    session = await repos.sessions.get(session_id=session_id)
    if session is None or session.status == SessionStatus.CLOSED:
        return
    await record_event(
        repos,
        event_type="session.scheduler_unhealthy",
        message=(
            f"Scheduler unhealthy for {session_id}: {failure_count} recent "
            "DBOS workflow infrastructure failure(s)."
        ),
        session_id=session_id,
        project_id=project_id,
        payload={
            "failure_count": failure_count,
            "reason": reason,
            "window_seconds": DEFAULTS.scheduler_unhealthy_window_seconds,
        },
    )
    await _close_session(
        repos=repos,
        session_id=session_id,
        event_type="session.failed",
        message=(
            f"Session failed: scheduler unhealthy after {failure_count} "
            "recent DBOS workflow infrastructure failure(s)."
        ),
        payload={
            "failure_count": failure_count,
            "reason": reason,
            "window_seconds": DEFAULTS.scheduler_unhealthy_window_seconds,
        },
    )


async def _close_if_scheduler_unhealthy(
    *,
    repos: Repositories,
    session_id: str,
    project_id: str,
) -> bool:
    failure_count = await _recent_infrastructure_failure_count(
        repos=repos,
        session_id=session_id,
    )
    if failure_count < DEFAULTS.scheduler_unhealthy_failure_threshold:
        return False
    await _close_session_for_scheduler_unhealthy(
        repos=repos,
        session_id=session_id,
        project_id=project_id,
        failure_count=failure_count,
        reason="infrastructure_failure_threshold",
    )
    return True


async def _maybe_close_session(
    repos: Repositories,
    *,
    session_id: str,
    project_id: str,
) -> None:
    """If no in-flight workflows remain and no runnable tasks exist, close the session."""
    session = await repos.sessions.get(session_id=session_id)
    if session is None or session.status == SessionStatus.CLOSED:
        return
    in_flight = await repos.tasks.count_in_progress_for_session(session_id=session_id)
    if in_flight > 0:
        return
    backlog = await repos.tasks.count_backlog_for_project(project_id=project_id)
    if backlog > 0:
        return
    if await has_pending_critic_records(repos=repos, project_id=project_id):
        return
    open_evidence = await list_open_evidence_records(
        repos=repos,
        project_id=project_id,
    )
    if open_evidence:
        await _close_session(
            repos=repos,
            session_id=session_id,
            event_type="session.failed",
            message=(
                f"Session failed: {session_id} drained with open evidence records."
            ),
            payload={
                "reason": "open_evidence_records",
                "open_records": [
                    {
                        "kind": record.kind.value,
                        "record_id": record.record_id,
                        "status": record.status.value,
                    }
                    for record in open_evidence
                ],
            },
        )
        return
    failure_count = await _recent_infrastructure_failure_count(
        repos=repos,
        session_id=session_id,
    )
    if failure_count > 0:
        await _close_session_for_scheduler_unhealthy(
            repos=repos,
            session_id=session_id,
            project_id=project_id,
            failure_count=failure_count,
            reason="drained_after_infrastructure_failure",
        )
        return
    selected_patch_artifact_id = await record_selected_patch_handoff(
        repos=repos,
        session_id=session_id,
        project_id=project_id,
    )
    payload: dict[str, Any] = {"summary": "drained"}
    if selected_patch_artifact_id is not None:
        payload["selected_patch_artifact_id"] = selected_patch_artifact_id
    await _close_session(
        repos=repos,
        session_id=session_id,
        event_type="session.completed",
        message=f"Completed {session_id}: drained.",
        payload=payload,
    )


async def _enqueue_manager_plan(
    *,
    repos: Repositories,
    session_id: str,
    project_id: str,
    workspace_root: str,
    home: str | None,
    app_root: str | None,
    title: str,
    content: str,
) -> TaskRecord:
    plan = await create_plan_task(
        repos,
        session_id=session_id,
        project_id=project_id,
        title=title,
        content=content,
    )
    await enqueue_task(
        repos=repos,
        task=plan,
        session_id=session_id,
        project_id=project_id,
        workspace_root=workspace_root,
        home=home,
        app_root=app_root,
    )
    return plan


async def _continue_after_producer(
    *,
    repos: Repositories,
    session_id: str,
    project_id: str,
    workspace_root: str,
    home: str | None,
    app_root: str | None,
    plan_title: str,
    plan_content: str,
    trigger_id: str,
) -> None:
    if await _close_if_scheduler_unhealthy(
        repos=repos,
        session_id=session_id,
        project_id=project_id,
    ):
        return
    review_work_items = await sync_critic_review_work_items(
        repos=repos,
        project_id=project_id,
        session_id=session_id,
    )
    if review_work_items:
        await enqueue_ready_critic_reviews(
            repos=repos,
            session_id=session_id,
            project_id=project_id,
            trigger_id=trigger_id,
            workspace_root=workspace_root,
            home=home,
            app_root=app_root,
        )
        return

    await _enqueue_manager_plan(
        repos=repos,
        session_id=session_id,
        project_id=project_id,
        workspace_root=workspace_root,
        home=home,
        app_root=app_root,
        title=plan_title,
        content=plan_content,
    )


async def _continue_after_critic(
    *,
    repos: Repositories,
    session_id: str,
    project_id: str,
    workspace_root: str,
    home: str | None,
    app_root: str | None,
    trigger_id: str,
) -> None:
    review_work_items = await sync_critic_review_work_items(
        repos=repos,
        project_id=project_id,
        session_id=session_id,
    )
    if review_work_items:
        await enqueue_ready_critic_reviews(
            repos=repos,
            session_id=session_id,
            project_id=project_id,
            trigger_id=trigger_id,
            workspace_root=workspace_root,
            home=home,
            app_root=app_root,
        )
        return

    drain_token = await critic_review_drain_token(
        repos=repos,
        project_id=project_id,
    )
    claimed = await repos.continuation_claims.try_claim(
        claim_key=f"manager-plan-after-critic:{project_id}:{drain_token}",
        project_id=project_id,
        session_id=session_id,
        kind="manager_plan_after_critic_drain",
        payload={
            "drain_token": drain_token,
            "trigger_id": trigger_id,
        },
    )
    if not claimed:
        return

    await _enqueue_manager_plan(
        repos=repos,
        session_id=session_id,
        project_id=project_id,
        workspace_root=workspace_root,
        home=home,
        app_root=app_root,
        title="Plan from critic review",
        content=(
            "A Critic review just completed. Review the review activity, "
            "concerns, project state, task board, and experiment budget. "
            "File the next focused Researcher or Scientist task so the "
            "research loop keeps moving."
        ),
    )


async def _run_critic_review_with_retries(
    *,
    run_review: Callable[..., Awaitable[Any]],
    repos: Repositories,
    workspace_payload: dict[str, Any],
    setup_objective: str,
    setup_research_context: str,
    session_id: str,
    project_id: str,
    app_root: str | None,
    assigned_review_target: str | None = None,
    assigned_review_target_kind: str | None = None,
    assigned_review_target_id: str | None = None,
    assigned_review_work_item_id: str | None = None,
) -> Any:
    for attempt in range(1, _CRITIC_REVIEW_MAX_ATTEMPTS + 1):
        try:
            return await run_review(
                workspace=workspace_payload,
                setup_objective=setup_objective,
                setup_research_context=setup_research_context,
                session_id=session_id,
                assigned_task_ids=[],
                assigned_review_target=assigned_review_target,
                assigned_review_target_kind=assigned_review_target_kind,
                assigned_review_target_id=assigned_review_target_id,
                assigned_review_work_item_id=assigned_review_work_item_id,
                app_root=Path(app_root) if app_root else None,
                repos=repos,
            )
        except Exception as error:
            if (
                attempt >= _CRITIC_REVIEW_MAX_ATTEMPTS
                or not _is_retryable_critic_error(error)
            ):
                raise
            delay_seconds = _critic_retry_delay_seconds(attempt)
            next_attempt = attempt + 1
            status_code = _retryable_critic_status_code(error)
            set_current_span_attributes(
                critic_retry_attempt=next_attempt,
                critic_retry_delay_seconds=delay_seconds,
                critic_retry_status_code=status_code,
            )
            await record_event(
                repos=repos,
                event_type="session.critic_retrying",
                message=(
                    "Critic review hit a transient model/API error; "
                    f"retrying attempt {next_attempt}/{_CRITIC_REVIEW_MAX_ATTEMPTS} "
                    f"after {delay_seconds}s."
                ),
                session_id=session_id,
                project_id=project_id,
                payload={
                    "attempt": attempt,
                    "next_attempt": next_attempt,
                    "max_attempts": _CRITIC_REVIEW_MAX_ATTEMPTS,
                    "delay_seconds": delay_seconds,
                    "status_code": status_code,
                    "error": str(error),
                },
            )
            await DBOS.sleep_async(delay_seconds)
    raise RuntimeError("unreachable critic retry state")


async def _finish_task_after_agent_pass(
    *,
    repos: Repositories,
    task: TaskRecord,
    session_id: str,
    snapshot: TaskStatusSnapshot,
    result_summary: str,
) -> AgentPassFinish:
    postcondition = await validate_task_status_progress(
        repos=repos,
        snapshot=snapshot,
    )
    if postcondition.ok:
        await finish_task(
            repos=repos,
            task=task,
            session_id=session_id,
            status=TaskStatus.DONE,
            result_summary=result_summary,
        )
        return AgentPassFinish(ok=True, summary=postcondition.reason)

    summary = f"Task failed postcondition: {postcondition.reason}"
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
    return AgentPassFinish(ok=False, summary=summary)


async def _setup_for_session(
    repos: Repositories,
    *,
    session_id: str,
) -> dict[str, str]:
    session = await repos.sessions.get(session_id=session_id)
    project = (
        await repos.projects.get(project_id=session.project_id)
        if session is not None and session.project_id is not None
        else None
    )
    return {
        "objective": project.objective if project is not None else "",
        "research_context": project.research_context if project is not None else "",
    }


async def _project_is_closed(repos: Repositories, project_id: str) -> bool:
    project = await repos.projects.get(project_id=project_id)
    return project is not None and project.status == ProjectStatus.CLOSED


async def _session_is_closed(repos: Repositories, session_id: str) -> bool:
    session = await repos.sessions.get(session_id=session_id)
    return session is None or session.status == SessionStatus.CLOSED


# ---------------------------------------------------------------------------
# task workflows and status-driven Critic review
# ---------------------------------------------------------------------------


@DBOS.workflow(name="situ.task.run_manager")
async def run_manager_workflow(
    task_id: str,
    session_id: str,
    project_id: str,
    workspace_root: str,
    home: str | None = None,
    app_root: str | None = None,
) -> None:
    set_current_span_attributes(
        workflow_name="situ.task.run_manager",
        workflow_id=_current_workflow_id(),
        task_id=task_id,
        session_id=session_id,
        project_id=project_id,
        workspace_root=workspace_root,
        agent_kind=AgentKind.MANAGER.value,
    )
    context, _db, repos = await _open_workflow_context(
        workspace_root=workspace_root, home=home
    )
    await _run_manager_workflow_body(
        context=context,
        repos=repos,
        task_id=task_id,
        session_id=session_id,
        project_id=project_id,
    )


async def _run_manager_workflow_body(
    *,
    context: ProjectContext,
    repos: Repositories,
    task_id: str,
    session_id: str,
    project_id: str,
) -> None:
    from ...agent_runtime import get_agent_runtime

    if await _session_is_closed(repos, session_id):
        return
    if await _project_is_closed(repos, project_id):
        return

    runtime = await get_agent_runtime(context.project_dir)
    claimed = await claim_task(
        repos=repos,
        task_id=task_id,
        session_id=session_id,
        project_id=project_id,
        agent_kind=AgentKind.MANAGER,
        model_name=runtime.model_name,
    )
    if claimed is None:
        return
    task, _agent = claimed
    set_current_span_attributes(
        task_kind=task.kind.value,
        agent_id=_agent.id,
        agent_kind=_agent.kind.value,
    )

    workspace = await repos.workspaces.get()
    if workspace is None:
        await finish_task(
            repos=repos,
            task=task,
            session_id=session_id,
            status=TaskStatus.FAILED,
            result_summary="missing workspace",
        )
        return

    snapshot = await capture_task_status_snapshot(repos=repos, task=task)
    setup = await _setup_for_session(repos, session_id=session_id)
    try:
        result = await runtime.plan_session(
            workspace=workspace.model_dump(),
            setup_objective=setup["objective"],
            setup_research_context=setup["research_context"],
            assigned_task_ids=[task.id],
            session_id=session_id,
            repos=repos,
        )
    except Exception as error:
        logfire.warning(
            "manager workflow failed task={task} error={error}",
            task=task.id,
            error=str(error),
        )
        await finish_task(
            repos=repos,
            task=task,
            session_id=session_id,
            status=TaskStatus.FAILED,
            result_summary=str(error),
        )
        await _maybe_close_session(repos, session_id=session_id, project_id=project_id)
        raise

    await record_event(
        repos,
        event_type="session.manager_completed",
        message=result.summary,
        session_id=session_id,
        project_id=project_id,
        payload=result.model_dump(),
    )
    finish = await _finish_task_after_agent_pass(
        repos=repos,
        task=task,
        session_id=session_id,
        snapshot=snapshot,
        result_summary=result.summary,
    )
    if not finish.ok:
        await _close_session(
            repos=repos,
            session_id=session_id,
            event_type="session.failed",
            message=f"Session failed: {task.id} made no required status progress.",
            payload={"task_id": task.id, "reason": finish.summary},
        )
        return
    await _maybe_close_session(repos, session_id=session_id, project_id=project_id)


@DBOS.workflow(name="situ.critic.review")
async def run_critic_review_workflow(
    *,
    session_id: str,
    project_id: str,
    workspace_root: str,
    home: str | None = None,
    app_root: str | None = None,
) -> None:
    from ...agent_runtime import get_agent_runtime

    set_current_span_attributes(
        workflow_name="situ.critic.review",
        workflow_id=_current_workflow_id(),
        session_id=session_id,
        project_id=project_id,
        workspace_root=workspace_root,
        agent_kind=AgentKind.CRITIC.value,
    )
    context, _db, repos = await _open_workflow_context(
        workspace_root=workspace_root, home=home
    )
    if await _session_is_closed(repos, session_id):
        return
    if await _project_is_closed(repos, project_id):
        return

    review_work_items = await sync_critic_review_work_items(
        repos=repos,
        project_id=project_id,
        session_id=session_id,
    )
    if not review_work_items:
        return

    workspace = await repos.workspaces.get()
    if workspace is None:
        await record_event(
            repos,
            event_type="session.critic_failed",
            message="Critic review failed: missing workspace",
            session_id=session_id,
            project_id=project_id,
            payload={"error": "missing workspace"},
        )
        await _close_session(
            repos,
            session_id=session_id,
            event_type="session.failed",
            message="Session failed: Critic review could not find the workspace.",
            payload={"error": "missing workspace", "reason": "critic_review_failed"},
        )
        return

    workflow_id = _current_workflow_id() or critic_review_workflow_id(
        session_id=session_id,
        trigger_id="untracked",
    )
    claim = await claim_critic_review_work_item(
        repos=repos,
        project_id=project_id,
        session_id=session_id,
        owner_workflow_id=workflow_id,
        lease_seconds=_CRITIC_REVIEW_WORK_ITEM_LEASE_SECONDS,
    )
    if claim is None:
        return
    review_target = critic_review_target_label(claim.target)
    set_current_span_attributes(
        work_item_id=claim.work_item.id,
        work_item_attempt=claim.work_item.attempt,
        review_target_kind=claim.target.kind,
        review_target_id=claim.target.record_id,
        review_target_status=claim.target.status.value,
    )

    runtime = await get_agent_runtime(context.project_dir)
    setup = await _setup_for_session(repos, session_id=session_id)
    try:
        result = await _run_critic_review_with_retries(
            run_review=runtime.run_review,
            repos=repos,
            workspace_payload=workspace.model_dump(),
            setup_objective=setup["objective"],
            setup_research_context=setup["research_context"],
            session_id=session_id,
            project_id=project_id,
            app_root=app_root,
            assigned_review_target=review_target,
            assigned_review_target_kind=claim.target.kind,
            assigned_review_target_id=claim.target.record_id,
            assigned_review_work_item_id=claim.work_item.id,
        )
    except Exception as error:
        await fail_critic_review_work_item(
            repos=repos,
            work_item=claim.work_item,
            error=error,
        )
        logfire.warning(
            "critic review workflow failed session={session} error={error}",
            session=session_id,
            error=str(error),
        )
        await record_event(
            repos,
            event_type="session.critic_failed",
            message=f"Critic review failed: {error}",
            session_id=session_id,
            project_id=project_id,
            payload={"error": str(error)},
        )
        await _close_session(
            repos,
            session_id=session_id,
            event_type="session.failed",
            message=f"Session failed: Critic review failed: {error}",
            payload={"error": str(error), "reason": "critic_review_failed"},
        )
        raise

    finished_work_item = await finish_critic_review_work_item(
        repos=repos,
        project_id=project_id,
        work_item=claim.work_item,
        max_noop_attempts=DEFAULTS.critic_review_max_noop_attempts,
    )
    result_payload = result.model_dump()
    result_payload["work_item_id"] = claim.work_item.id
    result_payload["work_item_status"] = (
        finished_work_item.status.value if finished_work_item is not None else None
    )
    result_payload["review_target"] = {
        "kind": claim.target.kind,
        "record_id": claim.target.record_id,
        "status": claim.target.status.value,
    }
    if (
        finished_work_item is not None
        and finished_work_item.status == WorkItemStatus.FAILED
    ):
        result_payload["reason"] = "critic_review_stalled"
        result_payload["max_noop_attempts"] = DEFAULTS.critic_review_max_noop_attempts
        await record_event(
            repos,
            event_type="session.critic_stalled",
            message=f"Critic review stalled on {review_target}",
            session_id=session_id,
            project_id=project_id,
            payload=result_payload,
        )
        await _close_session(
            repos,
            session_id=session_id,
            event_type="session.failed",
            message=f"Session failed: Critic review stalled on {review_target}.",
            payload={
                "reason": "critic_review_stalled",
                "work_item_id": claim.work_item.id,
                "review_target": result_payload["review_target"],
                "max_noop_attempts": DEFAULTS.critic_review_max_noop_attempts,
            },
        )
        return

    event = await record_event(
        repos,
        event_type="session.critic_completed",
        message=result.summary,
        session_id=session_id,
        project_id=project_id,
        payload=result_payload,
    )
    await _continue_after_critic(
        repos=repos,
        session_id=session_id,
        project_id=project_id,
        workspace_root=workspace_root,
        home=home,
        app_root=app_root,
        trigger_id=f"critic:{event.id}",
    )

    await _maybe_close_session(repos, session_id=session_id, project_id=project_id)


@DBOS.workflow(name="situ.task.run_researcher")
async def run_researcher_workflow(
    task_id: str,
    session_id: str,
    project_id: str,
    workspace_root: str,
    home: str | None = None,
    app_root: str | None = None,
) -> None:
    from ...agent_runtime import get_agent_runtime

    set_current_span_attributes(
        workflow_name="situ.task.run_researcher",
        workflow_id=_current_workflow_id(),
        task_id=task_id,
        session_id=session_id,
        project_id=project_id,
        workspace_root=workspace_root,
        agent_kind=AgentKind.RESEARCHER.value,
    )
    context, _db, repos = await _open_workflow_context(
        workspace_root=workspace_root, home=home
    )
    if await _session_is_closed(repos, session_id):
        return
    if await _project_is_closed(repos, project_id):
        return

    runtime = await get_agent_runtime(context.project_dir)
    claimed = await claim_task(
        repos=repos,
        task_id=task_id,
        session_id=session_id,
        project_id=project_id,
        agent_kind=AgentKind.RESEARCHER,
        model_name=runtime.model_name,
    )
    if claimed is None:
        return
    task, _agent = claimed
    set_current_span_attributes(
        task_kind=task.kind.value,
        agent_id=_agent.id,
        agent_kind=_agent.kind.value,
    )

    workspace = await repos.workspaces.get()
    if workspace is None:
        await finish_task(
            repos=repos,
            task=task,
            session_id=session_id,
            status=TaskStatus.FAILED,
            result_summary="missing workspace",
        )
        return

    snapshot = await capture_task_status_snapshot(repos=repos, task=task)
    setup = await _setup_for_session(repos, session_id=session_id)
    try:
        result = await runtime.run_research(
            workspace=workspace.model_dump(),
            setup_objective=setup["objective"],
            setup_research_context=setup["research_context"],
            session_id=session_id,
            assigned_task_ids=[task.id],
            app_root=Path(app_root) if app_root else None,
            repos=repos,
        )
    except Exception as error:
        logfire.warning(
            "researcher workflow failed task={task} error={error}",
            task=task.id,
            error=str(error),
        )
        await finish_task(
            repos=repos,
            task=task,
            session_id=session_id,
            status=TaskStatus.FAILED,
            result_summary=str(error),
        )
        await _maybe_close_session(repos, session_id=session_id, project_id=project_id)
        raise

    await record_event(
        repos,
        event_type="session.researcher_completed",
        message=result.summary,
        session_id=session_id,
        project_id=project_id,
        payload=result.model_dump(),
    )
    finish = await _finish_task_after_agent_pass(
        repos=repos,
        task=task,
        session_id=session_id,
        snapshot=snapshot,
        result_summary=result.summary,
    )

    await _continue_after_producer(
        repos=repos,
        session_id=session_id,
        project_id=project_id,
        workspace_root=workspace_root,
        home=home,
        app_root=app_root,
        plan_title=(
            "Recover from failed Researcher task"
            if not finish.ok
            else "Plan next research step"
        ),
        trigger_id=task.id,
        plan_content=(
            (
                "A Researcher task failed its status-progress postcondition. "
                f"Reason: {finish.summary} Review the failed task, project "
                "board, research records, task board, recent activity, "
                "analyses, and hypotheses. File the next focused Researcher "
                "or Scientist task that can recover the loop."
            )
            if not finish.ok
            else (
                "A Researcher task just completed. Review the project board "
                "and research records, task board, recent activity, analyses, "
                "and hypotheses. File the next focused Researcher or Scientist "
                "task so the research loop keeps moving."
            )
        ),
    )
    await _maybe_close_session(repos, session_id=session_id, project_id=project_id)


@DBOS.workflow(name="situ.task.run_scientist")
async def run_scientist_workflow(
    task_id: str,
    session_id: str,
    project_id: str,
    workspace_root: str,
    home: str | None = None,
    app_root: str | None = None,
) -> None:
    from ...agent_runtime import get_agent_runtime

    set_current_span_attributes(
        workflow_name="situ.task.run_scientist",
        workflow_id=_current_workflow_id(),
        task_id=task_id,
        session_id=session_id,
        project_id=project_id,
        workspace_root=workspace_root,
        agent_kind=AgentKind.SCIENTIST.value,
    )
    context, _db, repos = await _open_workflow_context(
        workspace_root=workspace_root, home=home
    )
    if await _session_is_closed(repos, session_id):
        return
    if await _project_is_closed(repos, project_id):
        return

    pre_claim_task = await repos.tasks.get_dispatchable(
        task_id=task_id,
        eligible_kinds=(TaskKind.BASELINE, TaskKind.EXPERIMENT),
    )
    if pre_claim_task is None:
        return
    if (
        pre_claim_task.project_id != project_id
        or pre_claim_task.created_in_session_id != session_id
    ):
        return
    set_current_span_attributes(
        task_kind=pre_claim_task.kind.value,
        compute_attempt=task_compute_attempt(pre_claim_task),
    )

    target, pool, pool_known = await claim_compute_target(
        repos,
        task=pre_claim_task,
        session_id=session_id,
        project_id=project_id,
    )
    set_current_span_attributes(
        compute_pool=pool,
        compute_pool_known=pool_known,
        compute_target_id=target.id if target is not None else None,
    )
    if target is None:
        await record_compute_wait(
            repos,
            task=pre_claim_task,
            session_id=session_id,
            project_id=project_id,
            pool=pool,
            pool_known=pool_known,
        )
        await _park_for_compute(repos=repos, task=pre_claim_task)
        await _maybe_close_session(repos, session_id=session_id, project_id=project_id)
        return

    runtime = await get_agent_runtime(context.project_dir)
    claimed = await claim_task(
        repos=repos,
        task_id=task_id,
        session_id=session_id,
        project_id=project_id,
        agent_kind=AgentKind.SCIENTIST,
        model_name=runtime.model_name,
    )
    if claimed is None:
        # Someone else is handling the task; release the lease so it goes back
        # to the pool for whatever workflow ends up running it.
        await release_compute_target(
            repos,
            target_id=target.id,
            task_id=task_id,
            session_id=session_id,
            project_id=project_id,
        )
        return
    task, _agent = claimed
    set_current_span_attributes(
        task_kind=task.kind.value,
        agent_id=_agent.id,
        agent_kind=_agent.kind.value,
    )
    await close_awaiting_compute_activities(repos, task_id=task.id)

    try:
        workspace = await repos.workspaces.get()
        if workspace is None:
            await finish_task(
                repos=repos,
                task=task,
                session_id=session_id,
                status=TaskStatus.FAILED,
                result_summary="missing workspace",
            )
            return

        setup = await _setup_for_session(repos, session_id=session_id)
        execution_repo_path = workspace.repo_path
        active_experiment_id: str | None = None
        is_experiment = task.kind == TaskKind.EXPERIMENT

        if is_experiment:
            hypothesis_ids = await experiment_task_hypothesis_ids(repos=repos, task=task)
            if not hypothesis_ids:
                summary = (
                    "Experiment task failed precondition: missing accepted or "
                    "active hypothesis_ids."
                )
                await finish_task(
                    repos=repos,
                    task=task,
                    session_id=session_id,
                    status=TaskStatus.FAILED,
                    result_summary=summary,
                )
                await _continue_after_producer(
                    repos=repos,
                    session_id=session_id,
                    project_id=project_id,
                    workspace_root=workspace_root,
                    home=home,
                    app_root=app_root,
                    plan_title="Recover from unbacked experiment task",
                    trigger_id=task.id,
                    plan_content=(
                        "A Scientist experiment task was missing accepted or "
                        "active hypothesis context. Review the project board, "
                        "baseline evidence, analyses, hypotheses, and task "
                        "board. File Researcher or hypothesize work if no "
                        "usable hypotheses exist; otherwise file a new "
                        "hypothesis-backed Scientist experiment task."
                    ),
                )
                await _maybe_close_session(
                    repos, session_id=session_id, project_id=project_id
                )
                return
            prepared = await prepare_experiment_task(
                repos=repos,
                context=context,
                task=task,
                session_id=session_id,
                workspace_repo_path=workspace.repo_path,
            )
            task = prepared.task
            execution_repo_path = prepared.repo_path
            active_experiment_id = prepared.experiment.id
            set_current_span_attributes(
                active_experiment_id=active_experiment_id,
                execution_repo_path=execution_repo_path,
            )
        snapshot = await capture_task_status_snapshot(repos=repos, task=task)
        should_capture_experiment_result = False

        try:
            try:
                result = await runtime.run_session(
                    workspace=workspace.model_dump(),
                    setup_objective=setup["objective"],
                    setup_research_context=setup["research_context"],
                    session_id=session_id,
                    max_experiments=1,
                    assigned_task_ids=[task.id],
                    app_root=Path(app_root) if app_root else None,
                    repos=repos,
                    repo_path=execution_repo_path,
                    active_experiment_id=active_experiment_id,
                    execution_env=compute_target_execution_env(target),
                )
                should_capture_experiment_result = not await _session_is_closed(
                    repos,
                    session_id,
                )
            except Exception as error:
                if await _session_is_closed(repos, session_id):
                    raise
                should_capture_experiment_result = (
                    is_experiment and active_experiment_id is not None
                )
                failure_summary = str(error)
                logfire.warning(
                    "scientist workflow failed task={task} error={error}",
                    task=task.id,
                    error=failure_summary,
                )
                await finish_task(
                    repos=repos,
                    task=task,
                    session_id=session_id,
                    status=TaskStatus.FAILED,
                    result_summary=failure_summary,
                )
                await fail_owned_evidence_records_for_task(
                    repos=repos,
                    task=task,
                    session_id=session_id,
                    reason=(
                        "Scientist task failed before submitting usable "
                        f"experiment evidence: {failure_summary}"
                    ),
                )
                await _maybe_close_session(
                    repos, session_id=session_id, project_id=project_id
                )
                raise
        finally:
            if should_capture_experiment_result and active_experiment_id is not None:
                await capture_experiment_task_result(
                    repos=repos,
                    context=context,
                    experiment_id=active_experiment_id,
                    session_id=session_id,
                    workspace_repo_path=workspace.repo_path,
                )

        if await _session_is_closed(repos, session_id):
            return

        await record_event(
            repos,
            event_type="session.agent_completed",
            message=result.summary,
            session_id=session_id,
            project_id=project_id,
            payload=result.model_dump(),
        )
        finish = await _finish_task_after_agent_pass(
            repos=repos,
            task=task,
            session_id=session_id,
            snapshot=snapshot,
            result_summary=result.summary,
        )

        await _continue_after_producer(
            repos=repos,
            session_id=session_id,
            project_id=project_id,
            workspace_root=workspace_root,
            home=home,
            app_root=app_root,
            plan_title=(
                "Recover from failed Scientist task"
                if not finish.ok
                else "Plan next experiment step"
            ),
            trigger_id=task.id,
            plan_content=(
                (
                    "A Scientist task failed its status-progress "
                    f"postcondition. Reason: {finish.summary} Review the "
                    "failed task, project board, research records, task board, "
                    "recent activity, and experiment budget. File the next "
                    "focused Researcher or Scientist task that can recover the "
                    "loop."
                )
                if not finish.ok
                else (
                    "A Scientist task just completed. Review the project board "
                    "and research records, task board, recent activity, and "
                    "experiment budget. File the next focused Researcher or "
                    "Scientist task so the research loop keeps moving."
                )
            ),
        )
    finally:
        await release_compute_target(
            repos,
            target_id=target.id,
            task_id=task_id,
            session_id=session_id,
            project_id=project_id,
        )

    await _maybe_close_session(repos, session_id=session_id, project_id=project_id)


# Force a stable reference to DEFAULTS for type checkers.
_ = DEFAULTS
