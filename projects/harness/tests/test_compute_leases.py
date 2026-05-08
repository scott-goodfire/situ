"""Tests for the compute-lease coordination model.

Exercises the repository, the default-target seed, the orphan recovery sweep,
and the lease helpers (claim, release, wait recording). Workflow-body
integration tests live separately because they need DBOS launched.
"""
from __future__ import annotations

from datetime import datetime, timedelta, timezone
from pathlib import Path
from typing import Any

import pytest
from dbos import WorkflowStatusString

from situ.harness.core.dbos import task_workflows
from situ.harness.core.db import Database
from situ.harness.core.db.serialization import utc_now
from situ.harness.core.state_invariants import check_state_invariants
from situ.harness.core.task_execution import (
    AWAITING_COMPUTE_ACTIVITY_TYPE,
    DEFAULT_LOCAL_LABEL,
    DEFAULT_LOCAL_POOL,
    claim_compute_target,
    close_awaiting_compute_activities,
    compute_target_execution_env,
    compute_wait_backoff_seconds,
    ensure_default_local_target,
    record_compute_wait,
    release_compute_target,
    release_orphan_leases,
    task_compute_pool,
)
from situ.harness.records import (
    ComputeTargetKind,
    ComputeTargetStatus,
    RecordStatus,
    TaskKind,
    TaskStatus,
)
from situ.harness.repositories import Repositories

pytestmark = pytest.mark.asyncio


async def _open_repos(tmp_path: Path) -> Repositories:
    home = tmp_path / "home"
    home.mkdir()
    db = await Database.open(
        home / "situ.sqlite",
        workspace_id="install",
        repo_path=str(home),
    )
    return Repositories.create(db)


async def _seed_workspace_and_project(repos: Repositories) -> tuple[str, str]:
    workspace = await repos.workspaces.ensure()
    project = await repos.projects.create(
        project_id="P1",
        workspace_id=workspace.id,
        title="Test",
        objective="Test.",
        research_context="Test.",
    )
    return workspace.id, project.id


async def _create_scientist_task(
    repos: Repositories,
    *,
    project_id: str,
    pool: str = "local",
    task_id: str | None = None,
    session_id: str | None = None,
) -> Any:
    payload: dict[str, Any] = {"compute": {"pool": pool}}
    return await repos.tasks.create(
        task_id=task_id or await repos.tasks.next_id(project_id=project_id),
        project_id=project_id,
        created_in_session_id=session_id,
        title="Run experiment",
        content="Run.",
        kind=TaskKind.EXPERIMENT,
        priority="high",
        source_kind="manager",
        payload=payload,
    )


# ---------------------------------------------------------------------------
# repository
# ---------------------------------------------------------------------------


async def test_register_and_list_targets(tmp_path: Path) -> None:
    repos = await _open_repos(tmp_path)
    target = await repos.compute_targets.register(
        pool="local",
        label="Slot 1",
    )
    assert target.id == "CT1"
    assert target.pool == "local"
    assert target.kind == ComputeTargetKind.LOCAL
    assert target.status == ComputeTargetStatus.IDLE
    listed = await repos.compute_targets.list_all()
    assert [t.id for t in listed] == ["CT1"]


async def test_compute_target_execution_env_maps_target_metadata(
    tmp_path: Path,
) -> None:
    repos = await _open_repos(tmp_path)
    target = await repos.compute_targets.register(
        pool="local",
        label="GPU 0",
        metadata={"cuda_visible_devices": 0},
    )

    env = compute_target_execution_env(target)

    assert env == {
        "SITU_COMPUTE_TARGET_ID": target.id,
        "SITU_COMPUTE_POOL": "local",
        "SITU_COMPUTE_TARGET_LABEL": "GPU 0",
        "CUDA_VISIBLE_DEVICES": "0",
    }


async def test_claim_is_atomic_and_single_winner(tmp_path: Path) -> None:
    repos = await _open_repos(tmp_path)
    await _seed_workspace_and_project(repos)
    await repos.compute_targets.register(pool="local", label="Slot 1")
    task_a = await _create_scientist_task(repos, project_id="P1", task_id="T1")
    task_b = await _create_scientist_task(repos, project_id="P1", task_id="T2")

    first = await repos.compute_targets.claim_for_pool(pool="local", task_id=task_a.id)
    second = await repos.compute_targets.claim_for_pool(pool="local", task_id=task_b.id)

    assert first is not None
    assert first.status == ComputeTargetStatus.CLAIMED
    assert first.claimed_by_task_id == task_a.id
    assert second is None  # no idle slot remains


async def test_release_returns_target_to_idle(tmp_path: Path) -> None:
    repos = await _open_repos(tmp_path)
    await _seed_workspace_and_project(repos)
    target = await repos.compute_targets.register(pool="local", label="Slot 1")
    task = await _create_scientist_task(repos, project_id="P1", task_id="T1")

    claimed = await repos.compute_targets.claim_for_pool(pool="local", task_id=task.id)
    assert claimed is not None
    released = await repos.compute_targets.release(
        target_id=target.id,
        owning_task_id=task.id,
    )
    assert released is not None
    assert released.status == ComputeTargetStatus.IDLE
    assert released.claimed_by_task_id is None


async def test_release_is_no_op_for_wrong_owner(tmp_path: Path) -> None:
    repos = await _open_repos(tmp_path)
    await _seed_workspace_and_project(repos)
    target = await repos.compute_targets.register(pool="local")
    task_a = await _create_scientist_task(repos, project_id="P1", task_id="T1")
    task_b = await _create_scientist_task(repos, project_id="P1", task_id="T2")

    claimed = await repos.compute_targets.claim_for_pool(pool="local", task_id=task_a.id)
    assert claimed is not None
    untouched = await repos.compute_targets.release(
        target_id=target.id,
        owning_task_id=task_b.id,
    )
    assert untouched is not None
    assert untouched.status == ComputeTargetStatus.CLAIMED
    assert untouched.claimed_by_task_id == task_a.id


async def test_pool_exists_excludes_dead_targets(tmp_path: Path) -> None:
    repos = await _open_repos(tmp_path)
    target = await repos.compute_targets.register(pool="h100", label="Borrowed slot")
    assert await repos.compute_targets.pool_exists(pool="h100") is True
    await repos.compute_targets.mark_dead(target_id=target.id)
    assert await repos.compute_targets.pool_exists(pool="h100") is False


async def test_remove_marks_target_dead(tmp_path: Path) -> None:
    repos = await _open_repos(tmp_path)
    target = await repos.compute_targets.register(pool="local")
    removed = await repos.compute_targets.remove(target_id=target.id)
    assert removed is not None
    assert removed.status == ComputeTargetStatus.DEAD
    refreshed = await repos.compute_targets.get(target_id=target.id)
    assert refreshed is not None
    assert refreshed.status == ComputeTargetStatus.DEAD


async def test_draining_claimed_target_releases_to_dead(tmp_path: Path) -> None:
    repos = await _open_repos(tmp_path)
    await _seed_workspace_and_project(repos)
    target = await repos.compute_targets.register(pool="local")
    task = await _create_scientist_task(repos, project_id="P1", task_id="T1")
    claimed = await repos.compute_targets.claim_for_pool(pool="local", task_id=task.id)
    assert claimed is not None
    drained = await repos.compute_targets.drain(target_id=target.id)
    assert drained is not None
    assert drained.status == ComputeTargetStatus.DRAINING

    released = await repos.compute_targets.release(
        target_id=target.id,
        owning_task_id=task.id,
    )

    assert released is not None
    assert released.status == ComputeTargetStatus.DEAD
    assert released.claimed_by_task_id is None


async def test_task_workflow_id_reservation_is_single_winner(tmp_path: Path) -> None:
    repos = await _open_repos(tmp_path)
    await _seed_workspace_and_project(repos)
    task = await _create_scientist_task(repos, project_id="P1", task_id="T1")

    first = await repos.tasks.try_set_workflow_id(
        task_id=task.id,
        workflow_id="task:T1:a1",
    )
    second = await repos.tasks.try_set_workflow_id(
        task_id=task.id,
        workflow_id="task:T1:a1",
    )

    assert first is True
    assert second is False


# ---------------------------------------------------------------------------
# default target seed
# ---------------------------------------------------------------------------


async def test_ensure_default_local_target_creates_one(tmp_path: Path) -> None:
    repos = await _open_repos(tmp_path)
    target = await ensure_default_local_target(repos)
    assert target.pool == DEFAULT_LOCAL_POOL
    assert target.label == DEFAULT_LOCAL_LABEL
    assert target.kind == ComputeTargetKind.LOCAL


async def test_ensure_default_local_target_is_idempotent(tmp_path: Path) -> None:
    repos = await _open_repos(tmp_path)
    first = await ensure_default_local_target(repos)
    second = await ensure_default_local_target(repos)
    assert first.id == second.id
    listed = await repos.compute_targets.list_for_pool(pool="local")
    assert len(listed) == 1


# ---------------------------------------------------------------------------
# orphan recovery
# ---------------------------------------------------------------------------


async def test_release_orphan_leases_releases_terminal_owner(tmp_path: Path) -> None:
    repos = await _open_repos(tmp_path)
    await _seed_workspace_and_project(repos)
    target = await repos.compute_targets.register(pool="local")
    task = await _create_scientist_task(repos, project_id="P1", task_id="T1")
    claimed = await repos.compute_targets.claim_for_pool(pool="local", task_id=task.id)
    assert claimed is not None
    # Mark task as DONE without releasing — simulates a crashed workflow.
    await repos.tasks.update(
        task_id=task.id,
        status=TaskStatus.DONE,
        result_summary="finished elsewhere",
    )

    released = await release_orphan_leases(repos)
    assert [t.id for t in released] == [target.id]
    refreshed = await repos.compute_targets.get(target_id=target.id)
    assert refreshed is not None
    assert refreshed.status == ComputeTargetStatus.IDLE


async def test_release_orphan_leases_releases_when_no_workflow_id(
    tmp_path: Path,
) -> None:
    repos = await _open_repos(tmp_path)
    await _seed_workspace_and_project(repos)
    target = await repos.compute_targets.register(pool="local")
    task = await _create_scientist_task(repos, project_id="P1", task_id="T1")
    claimed = await repos.compute_targets.claim_for_pool(pool="local", task_id=task.id)
    assert claimed is not None
    # Move the task to in_progress but leave workflow_id NULL — stranded between
    # claim and enqueue; safe to release.
    await repos.tasks.update(
        task_id=task.id,
        status=TaskStatus.IN_PROGRESS,
    )

    released = await release_orphan_leases(repos)
    assert [t.id for t in released] == [target.id]


async def test_release_orphan_leases_skips_in_progress_with_workflow_id(
    tmp_path: Path,
) -> None:
    repos = await _open_repos(tmp_path)
    await _seed_workspace_and_project(repos)
    target = await repos.compute_targets.register(pool="local")
    task = await _create_scientist_task(repos, project_id="P1", task_id="T1")
    claimed = await repos.compute_targets.claim_for_pool(pool="local", task_id=task.id)
    assert claimed is not None
    await repos.tasks.update(
        task_id=task.id,
        status=TaskStatus.IN_PROGRESS,
    )
    await repos.tasks.set_workflow_id(task_id=task.id, workflow_id="task:T1:a1")

    released = await release_orphan_leases(repos)
    assert released == []
    refreshed = await repos.compute_targets.get(target_id=target.id)
    assert refreshed is not None
    assert refreshed.status == ComputeTargetStatus.CLAIMED


async def test_release_orphan_leases_fails_stale_in_progress_owner(
    tmp_path: Path,
) -> None:
    repos = await _open_repos(tmp_path)
    workspace_id, project_id = await _seed_workspace_and_project(repos)
    session = await repos.sessions.create(
        session_id="S1", workspace_id=workspace_id, project_id=project_id
    )
    target = await repos.compute_targets.register(pool="local")
    task = await _create_scientist_task(
        repos,
        project_id=project_id,
        task_id="T1",
        session_id=session.id,
    )
    claimed = await repos.compute_targets.claim_for_pool(pool="local", task_id=task.id)
    assert claimed is not None
    await repos.tasks.update(
        task_id=task.id,
        status=TaskStatus.IN_PROGRESS,
        claimed_in_session_id=session.id,
    )
    await repos.tasks.set_workflow_id(task_id=task.id, workflow_id="task:T1:a1")
    old = (datetime.now(timezone.utc) - timedelta(hours=2)).isoformat()
    await repos.tasks.db.execute(
        "UPDATE tasks SET claimed_at = ?, updated_at = ? WHERE id = ?",
        (old, old, task.id),
    )
    await repos.compute_targets.db.execute(
        "UPDATE compute_targets SET claimed_at = ?, updated_at = ? WHERE id = ?",
        (old, old, target.id),
    )

    released = await release_orphan_leases(repos)

    refreshed_target = await repos.compute_targets.get(target_id=target.id)
    refreshed_task = await repos.tasks.get(task_id=task.id)
    events = await repos.events.list_all()

    assert [t.id for t in released] == [target.id]
    assert refreshed_target is not None
    assert refreshed_target.status == ComputeTargetStatus.IDLE
    assert refreshed_task is not None
    assert refreshed_task.status == TaskStatus.FAILED
    assert refreshed_task.payload["last_infrastructure_failure"]["kind"] == (
        "stale_compute_lease"
    )
    assert any(
        event.type == "compute_target.released"
        and event.payload["reason"] == "stale_in_progress_no_recent_receipts"
        for event in events
    )


async def test_release_orphan_leases_keeps_stale_owner_with_recent_receipt(
    tmp_path: Path,
) -> None:
    repos = await _open_repos(tmp_path)
    workspace_id, project_id = await _seed_workspace_and_project(repos)
    session = await repos.sessions.create(
        session_id="S1", workspace_id=workspace_id, project_id=project_id
    )
    target = await repos.compute_targets.register(pool="local")
    task = await _create_scientist_task(
        repos,
        project_id=project_id,
        task_id="T1",
        session_id=session.id,
    )
    claimed = await repos.compute_targets.claim_for_pool(pool="local", task_id=task.id)
    assert claimed is not None
    await repos.tasks.update(
        task_id=task.id,
        status=TaskStatus.IN_PROGRESS,
        claimed_in_session_id=session.id,
    )
    await repos.tasks.set_workflow_id(task_id=task.id, workflow_id="task:T1:a1")
    old = (datetime.now(timezone.utc) - timedelta(hours=2)).isoformat()
    await repos.tasks.db.execute(
        "UPDATE tasks SET claimed_at = ?, updated_at = ? WHERE id = ?",
        (old, old, task.id),
    )
    await repos.compute_targets.db.execute(
        "UPDATE compute_targets SET claimed_at = ?, updated_at = ? WHERE id = ?",
        (old, old, target.id),
    )
    artifact = await repos.artifacts.create(
        artifact_id="ART1",
        project_id=project_id,
        created_in_session_id=session.id,
        associated_entity_kind="task",
        associated_entity_id=task.id,
        kind="command_receipt",
        title="Command receipt: train",
        path="artifacts/commands/receipt.json",
        media_type="application/json",
    )
    await repos.task_entity_links.create(
        project_id=project_id,
        task_id=task.id,
        entity_kind="artifact",
        entity_id=artifact.id,
        relationship="receipt",
    )

    released = await release_orphan_leases(repos)

    refreshed_target = await repos.compute_targets.get(target_id=target.id)
    refreshed_task = await repos.tasks.get(task_id=task.id)

    assert released == []
    assert refreshed_target is not None
    assert refreshed_target.status == ComputeTargetStatus.CLAIMED
    assert refreshed_task is not None
    assert refreshed_task.status == TaskStatus.IN_PROGRESS


# ---------------------------------------------------------------------------
# claim/release helpers
# ---------------------------------------------------------------------------


async def test_claim_compute_target_emits_event_and_publishes(tmp_path: Path) -> None:
    repos = await _open_repos(tmp_path)
    _ws_id, project_id = await _seed_workspace_and_project(repos)
    await repos.compute_targets.register(pool="local", label="Slot 1")
    task = await _create_scientist_task(repos, project_id=project_id, task_id="T1")
    session = await repos.sessions.create(
        session_id="S1", workspace_id=_ws_id, project_id=project_id
    )

    target, pool, pool_known = await claim_compute_target(
        repos,
        task=task,
        session_id=session.id,
        project_id=project_id,
    )

    assert target is not None
    assert pool == "local"
    assert pool_known is True
    events = [
        event for event in await repos.events.list_all()
        if event.type == "compute_target.claimed"
    ]
    assert len(events) == 1
    assert events[0].payload["target_id"] == target.id


async def test_claim_compute_target_unknown_pool_returns_none(tmp_path: Path) -> None:
    repos = await _open_repos(tmp_path)
    _ws_id, project_id = await _seed_workspace_and_project(repos)
    task = await _create_scientist_task(
        repos, project_id=project_id, pool="h100", task_id="T1"
    )
    session = await repos.sessions.create(
        session_id="S1", workspace_id=_ws_id, project_id=project_id
    )

    target, pool, pool_known = await claim_compute_target(
        repos,
        task=task,
        session_id=session.id,
        project_id=project_id,
    )

    assert target is None
    assert pool == "h100"
    assert pool_known is False


async def test_release_compute_target_emits_event(tmp_path: Path) -> None:
    repos = await _open_repos(tmp_path)
    _ws_id, project_id = await _seed_workspace_and_project(repos)
    target = await repos.compute_targets.register(pool="local")
    task = await _create_scientist_task(repos, project_id=project_id, task_id="T1")
    session = await repos.sessions.create(
        session_id="S1", workspace_id=_ws_id, project_id=project_id
    )
    await repos.compute_targets.claim_for_pool(pool="local", task_id=task.id)

    released = await release_compute_target(
        repos,
        target_id=target.id,
        task_id=task.id,
        session_id=session.id,
        project_id=project_id,
    )

    assert released is not None
    assert released.status == ComputeTargetStatus.IDLE
    events = [
        event for event in await repos.events.list_all()
        if event.type == "compute_target.released"
    ]
    assert len(events) == 1


# ---------------------------------------------------------------------------
# wait recording dedup
# ---------------------------------------------------------------------------


async def test_record_compute_wait_inserts_one_activity_for_repeated_same_state(
    tmp_path: Path,
) -> None:
    repos = await _open_repos(tmp_path)
    _ws_id, project_id = await _seed_workspace_and_project(repos)
    task = await _create_scientist_task(repos, project_id=project_id, task_id="T1")
    session = await repos.sessions.create(
        session_id="S1", workspace_id=_ws_id, project_id=project_id
    )

    for _ in range(3):
        await record_compute_wait(
            repos,
            task=task,
            session_id=session.id,
            project_id=project_id,
            pool="local",
            pool_known=False,
        )

    activities = [
        activity
        for activity in await repos.task_activities.list_for_task(task_id=task.id)
        if activity.payload.get("activity_type") == AWAITING_COMPUTE_ACTIVITY_TYPE
    ]
    assert len(activities) == 1
    assert activities[0].payload["attempt"] == 3
    assert activities[0].payload["pool"] == "local"
    assert activities[0].payload["pool_known"] is False

    pool_unknown_events = [
        event for event in await repos.events.list_all()
        if event.type == "task.compute_pool_unknown"
    ]
    assert len(pool_unknown_events) == 1


async def test_record_compute_wait_opens_new_activity_on_state_transition(
    tmp_path: Path,
) -> None:
    repos = await _open_repos(tmp_path)
    _ws_id, project_id = await _seed_workspace_and_project(repos)
    task = await _create_scientist_task(repos, project_id=project_id, task_id="T1")
    session = await repos.sessions.create(
        session_id="S1", workspace_id=_ws_id, project_id=project_id
    )

    await record_compute_wait(
        repos,
        task=task,
        session_id=session.id,
        project_id=project_id,
        pool="local",
        pool_known=False,
    )
    # Operator registers the pool — state transitions from unknown to busy.
    await record_compute_wait(
        repos,
        task=task,
        session_id=session.id,
        project_id=project_id,
        pool="local",
        pool_known=True,
    )

    activities = [
        activity
        for activity in await repos.task_activities.list_for_task(task_id=task.id)
        if activity.payload.get("activity_type") == AWAITING_COMPUTE_ACTIVITY_TYPE
    ]
    assert len(activities) == 2
    assert activities[0].payload["pool_known"] is False
    assert activities[0].payload.get("closed") is True
    assert activities[1].payload["pool_known"] is True
    assert activities[1].payload.get("closed") is not True

    events = [event.type for event in await repos.events.list_all()]
    assert "task.compute_pool_unknown" in events
    assert "task.waiting_for_compute" in events


async def test_close_awaiting_compute_activities_closes_open_record(
    tmp_path: Path,
) -> None:
    repos = await _open_repos(tmp_path)
    _ws_id, project_id = await _seed_workspace_and_project(repos)
    task = await _create_scientist_task(repos, project_id=project_id, task_id="T1")
    session = await repos.sessions.create(
        session_id="S1", workspace_id=_ws_id, project_id=project_id
    )
    await record_compute_wait(
        repos,
        task=task,
        session_id=session.id,
        project_id=project_id,
        pool="local",
        pool_known=True,
    )

    await close_awaiting_compute_activities(repos, task_id=task.id)

    activities = [
        activity
        for activity in await repos.task_activities.list_for_task(task_id=task.id)
        if activity.payload.get("activity_type") == AWAITING_COMPUTE_ACTIVITY_TYPE
    ]
    assert len(activities) == 1
    assert activities[0].payload["closed"] is True
    assert "closed_at" in activities[0].payload


# ---------------------------------------------------------------------------
# dispatch and compute parking
# ---------------------------------------------------------------------------


async def test_dispatch_runnable_tasks_enqueues_only_eligible_tasks(
    tmp_path: Path,
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    repos = await _open_repos(tmp_path)
    workspace_id, project_id = await _seed_workspace_and_project(repos)
    await repos.compute_targets.register(pool="local", label="Slot 1")
    session = await repos.sessions.create(
        session_id="S1", workspace_id=workspace_id, project_id=project_id
    )
    due_task = await _create_scientist_task(
        repos, project_id=project_id, task_id="T1", session_id=session.id
    )
    future = (
        datetime.now(timezone.utc) + timedelta(seconds=60)
    ).strftime("%Y-%m-%dT%H:%M:%S.%fZ")
    await repos.tasks.create(
        task_id="T2",
        project_id=project_id,
        created_in_session_id=session.id,
        title="Future task",
        content="Run later.",
        kind=TaskKind.EXPERIMENT,
        priority="high",
        source_kind="manager",
        payload={"compute": {"pool": "local"}},
        available_at=future,
    )
    claimed_elsewhere = await _create_scientist_task(
        repos, project_id=project_id, task_id="T3", session_id=session.id
    )
    await repos.tasks.set_workflow_id(
        task_id=claimed_elsewhere.id,
        workflow_id="task:T3:a1",
    )
    calls: list[str] = []

    async def fake_enqueue_task(**kwargs: Any) -> bool:
        task = kwargs["task"]
        calls.append(task.id)
        await kwargs["repos"].tasks.set_workflow_id(
            task_id=task.id,
            workflow_id=f"task:{task.id}:a1",
        )
        return True

    monkeypatch.setattr(task_workflows, "enqueue_task", fake_enqueue_task)

    count = await task_workflows.dispatch_runnable_tasks(
        repos=repos,
        project_id=project_id,
        session_id=session.id,
        home=str(tmp_path / "home"),
    )

    assert count == 1
    assert calls == [due_task.id]


async def test_dispatch_runnable_tasks_limits_scientists_to_idle_compute_slots(
    tmp_path: Path,
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    repos = await _open_repos(tmp_path)
    workspace_id, project_id = await _seed_workspace_and_project(repos)
    await repos.compute_targets.register(pool="local", label="Slot 1")
    session = await repos.sessions.create(
        session_id="S1", workspace_id=workspace_id, project_id=project_id
    )
    tasks = [
        await _create_scientist_task(
            repos,
            project_id=project_id,
            task_id=f"T{index}",
            session_id=session.id,
        )
        for index in range(1, 4)
    ]
    before = utc_now()
    enqueued_task_ids: list[str] = []

    async def fake_enqueue_task(**kwargs: Any) -> bool:
        task = kwargs["task"]
        enqueued_task_ids.append(task.id)
        await kwargs["repos"].tasks.set_workflow_id(
            task_id=task.id,
            workflow_id=f"task:{task.id}:a1",
        )
        return True

    monkeypatch.setattr(task_workflows, "enqueue_task", fake_enqueue_task)

    count = await task_workflows.dispatch_runnable_tasks(
        repos=repos,
        project_id=project_id,
        session_id=session.id,
        home=str(tmp_path / "home"),
    )

    parked = [await repos.tasks.get(task_id=task.id) for task in tasks[1:]]
    waiting_events = [
        event
        for event in await repos.events.list_for_session(session_id=session.id)
        if event.type == "task.waiting_for_compute"
    ]

    assert count == 1
    assert enqueued_task_ids == ["T1"]
    assert all(task is not None for task in parked)
    assert [(task.id, task.workflow_id) for task in parked if task is not None] == [
        ("T2", None),
        ("T3", None),
    ]
    assert [
        task.payload["compute_attempt"]
        for task in parked
        if task is not None
    ] == [2, 2]
    assert [
        task.payload["last_compute_wait_backoff_seconds"]
        for task in parked
        if task is not None
    ] == [5, 5]
    assert all(task is not None and task.available_at > before for task in parked)
    assert [event.payload["task_id"] for event in waiting_events] == ["T2", "T3"]


async def test_dispatch_sweep_releases_orphan_leases_before_enqueuing(
    tmp_path: Path,
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    repos = await _open_repos(tmp_path)
    workspace_id, project_id = await _seed_workspace_and_project(repos)
    session = await repos.sessions.create(
        session_id="S1", workspace_id=workspace_id, project_id=project_id
    )
    target = await repos.compute_targets.register(pool="local", label="Slot 1")
    stale_task = await _create_scientist_task(
        repos,
        project_id=project_id,
        task_id="T1",
        session_id=session.id,
    )
    await repos.tasks.update(
        task_id=stale_task.id,
        status=TaskStatus.IN_PROGRESS,
        claimed_in_session_id=session.id,
    )
    await repos.tasks.set_workflow_id(
        task_id=stale_task.id,
        workflow_id="task:T1:a1",
    )
    claimed = await repos.compute_targets.claim_for_pool(
        pool="local",
        task_id=stale_task.id,
    )
    assert claimed is not None
    old = (datetime.now(timezone.utc) - timedelta(hours=2)).isoformat()
    await repos.tasks.db.execute(
        "UPDATE tasks SET claimed_at = ?, updated_at = ? WHERE id = ?",
        (old, old, stale_task.id),
    )
    await repos.compute_targets.db.execute(
        "UPDATE compute_targets SET claimed_at = ?, updated_at = ? WHERE id = ?",
        (old, old, target.id),
    )
    due_task = await _create_scientist_task(
        repos,
        project_id=project_id,
        task_id="T2",
        session_id=session.id,
    )
    observed_target_statuses: list[ComputeTargetStatus] = []
    enqueued_task_ids: list[str] = []

    async def fake_enqueue_task(**kwargs: Any) -> bool:
        refreshed_target = await kwargs["repos"].compute_targets.get(
            target_id=target.id,
        )
        assert refreshed_target is not None
        observed_target_statuses.append(refreshed_target.status)
        task = kwargs["task"]
        enqueued_task_ids.append(task.id)
        await kwargs["repos"].tasks.set_workflow_id(
            task_id=task.id,
            workflow_id=f"task:{task.id}:a1",
        )
        return True

    monkeypatch.setattr(task_workflows, "enqueue_task", fake_enqueue_task)

    outcome = await task_workflows._run_task_dispatch_sweep_once(
        repos=repos,
        home=tmp_path / "home",
        app_root=None,
    )

    refreshed_target = await repos.compute_targets.get(target_id=target.id)
    refreshed_stale_task = await repos.tasks.get(task_id=stale_task.id)
    events = await repos.events.list_all()

    assert outcome["orphan_leases_released_count"] == 1
    assert outcome["enqueued_count"] == 1
    assert refreshed_target is not None
    assert refreshed_target.status == ComputeTargetStatus.IDLE
    assert refreshed_stale_task is not None
    assert refreshed_stale_task.status == TaskStatus.FAILED
    assert observed_target_statuses == [ComputeTargetStatus.IDLE]
    assert enqueued_task_ids == [due_task.id]
    assert any(
        event.type == "compute_target.released"
        and event.payload["reason"] == "stale_in_progress_no_recent_receipts"
        for event in events
    )


async def test_surface_failed_task_workflows_marks_task_failed_and_releases_compute(
    tmp_path: Path,
) -> None:
    repos = await _open_repos(tmp_path)
    workspace_id, project_id = await _seed_workspace_and_project(repos)
    session = await repos.sessions.create(
        session_id="S1", workspace_id=workspace_id, project_id=project_id
    )
    await repos.compute_targets.register(pool="local", label="Slot 1")
    task = await _create_scientist_task(
        repos, project_id=project_id, task_id="T1", session_id=session.id
    )
    await repos.tasks.set_workflow_id(task_id=task.id, workflow_id="task:T1:a1")
    claimed = await repos.compute_targets.claim_for_pool(
        pool="local",
        task_id=task.id,
    )
    assert claimed is not None

    class FailedWorkflow:
        status = WorkflowStatusString.ERROR
        name = "situ.task.run_scientist"
        error = RuntimeError("duplicate runtime registration")

    async def fake_status_getter(_workflow_id: str) -> FailedWorkflow:
        return FailedWorkflow()

    count = await task_workflows.surface_failed_task_workflows(
        repos=repos,
        workflow_status_getter=fake_status_getter,
    )

    failed = await repos.tasks.get(task_id=task.id)
    targets = await repos.compute_targets.list_all()
    events = await repos.events.list_for_session(session_id=session.id)

    assert count == 1
    assert failed is not None
    assert failed.status == TaskStatus.FAILED
    assert failed.workflow_id == "task:T1:a1"
    assert "duplicate runtime registration" in (failed.result_summary or "")
    assert [(target.id, target.status.value, target.claimed_by_task_id) for target in targets] == [
        ("CT1", "idle", None)
    ]
    assert any(event.type == "task.workflow_failed" for event in events)
    assert any(event.type == "compute_target.released" for event in events)


async def test_surface_stuck_unclaimed_task_workflows_fails_backlog_task(
    tmp_path: Path,
) -> None:
    repos = await _open_repos(tmp_path)
    workspace_id, project_id = await _seed_workspace_and_project(repos)
    session = await repos.sessions.create(
        session_id="S1", workspace_id=workspace_id, project_id=project_id
    )
    task = await repos.tasks.create(
        task_id="T1",
        project_id=project_id,
        created_in_session_id=session.id,
        title="Plan",
        content="Plan.",
        kind=TaskKind.PLAN,
        priority="high",
        source_kind="system",
    )
    await repos.tasks.set_workflow_id(task_id=task.id, workflow_id="task:T1:a1")
    old = (datetime.now(timezone.utc) - timedelta(seconds=60)).isoformat()
    await repos.tasks.db.execute(
        "UPDATE tasks SET updated_at = ? WHERE id = ?",
        (old, task.id),
    )

    class PendingWorkflow:
        status = WorkflowStatusString.PENDING
        name = "situ.task.run_manager"
        error = None

    async def fake_status_getter(_workflow_id: str) -> PendingWorkflow:
        return PendingWorkflow()

    count = await task_workflows.surface_stuck_unclaimed_task_workflows(
        repos=repos,
        workflow_status_getter=fake_status_getter,
        timeout_seconds=30,
    )

    failed = await repos.tasks.get(task_id=task.id)
    events = await repos.events.list_for_session(session_id=session.id)

    assert count == 1
    assert failed is not None
    assert failed.status == TaskStatus.FAILED
    assert "did not claim" in (failed.result_summary or "")
    assert failed.payload["last_infrastructure_failure"]["kind"] == "workflow_unclaimed"
    assert any(event.type == "task.workflow_stuck" for event in events)
    assert any(event.type == "session.failed" for event in events)


async def test_surface_stuck_in_progress_task_workflows_fails_claimed_task(
    tmp_path: Path,
) -> None:
    repos = await _open_repos(tmp_path)
    workspace_id, project_id = await _seed_workspace_and_project(repos)
    session = await repos.sessions.create(
        session_id="S1", workspace_id=workspace_id, project_id=project_id
    )
    task = await repos.tasks.create(
        task_id="T1",
        project_id=project_id,
        created_in_session_id=session.id,
        title="Plan",
        content="Plan.",
        kind=TaskKind.PLAN,
        priority="high",
        source_kind="system",
    )
    await repos.tasks.update(
        task_id=task.id,
        status=TaskStatus.IN_PROGRESS,
        claimed_in_session_id=session.id,
    )
    await repos.tasks.set_workflow_id(task_id=task.id, workflow_id="task:T1:a1")
    old = (datetime.now(timezone.utc) - timedelta(seconds=60)).isoformat()
    await repos.tasks.db.execute(
        "UPDATE tasks SET claimed_at = ?, updated_at = ? WHERE id = ?",
        (old, old, task.id),
    )

    class PendingWorkflow:
        status = WorkflowStatusString.PENDING
        name = "situ.task.run_manager"
        error = None

    async def fake_status_getter(_workflow_id: str) -> PendingWorkflow:
        return PendingWorkflow()

    count = await task_workflows.surface_stuck_in_progress_task_workflows(
        repos=repos,
        workflow_status_getter=fake_status_getter,
        timeout_seconds=30,
    )

    failed = await repos.tasks.get(task_id=task.id)
    refreshed_session = await repos.sessions.get(session_id=session.id)
    events = await repos.events.list_for_session(session_id=session.id)

    assert count == 1
    assert failed is not None
    assert failed.status == TaskStatus.FAILED
    assert "already in progress" in (failed.result_summary or "")
    assert failed.payload["last_infrastructure_failure"]["kind"] == (
        "workflow_in_progress_stalled"
    )
    assert refreshed_session is not None
    assert refreshed_session.status.value == "closed"
    assert any(event.type == "task.workflow_stuck" for event in events)
    assert any(event.type == "session.failed" for event in events)


async def test_repeated_unclaimed_workflows_stop_scheduler_retry_storm(
    tmp_path: Path,
) -> None:
    repos = await _open_repos(tmp_path)
    workspace_id, project_id = await _seed_workspace_and_project(repos)
    session = await repos.sessions.create(
        session_id="S1", workspace_id=workspace_id, project_id=project_id
    )
    old = (datetime.now(timezone.utc) - timedelta(seconds=60)).isoformat()
    for index in range(1, 5):
        task = await repos.tasks.create(
            task_id=f"T{index}",
            project_id=project_id,
            created_in_session_id=session.id,
            title=f"Plan {index}",
            content="Plan.",
            kind=TaskKind.PLAN,
            priority="high",
            source_kind="system",
        )
        await repos.tasks.set_workflow_id(
            task_id=task.id,
            workflow_id=f"task:{task.id}:a1",
        )
        await repos.tasks.db.execute(
            "UPDATE tasks SET updated_at = ? WHERE id = ?",
            (old, task.id),
        )

    class PendingWorkflow:
        status = WorkflowStatusString.PENDING
        name = "situ.task.run_manager"
        error = None

    async def fake_status_getter(_workflow_id: str) -> PendingWorkflow:
        return PendingWorkflow()

    count = await task_workflows.surface_stuck_unclaimed_task_workflows(
        repos=repos,
        workflow_status_getter=fake_status_getter,
        timeout_seconds=30,
        limit=3,
    )

    refreshed_session = await repos.sessions.get(session_id=session.id)
    fourth_task = await repos.tasks.get(task_id="T4")
    events = await repos.events.list_for_session(session_id=session.id)

    assert count == 3
    assert refreshed_session is not None
    assert refreshed_session.status.value == "closed"
    assert fourth_task is not None
    assert fourth_task.status == TaskStatus.BACKLOG
    assert any(event.type == "session.scheduler_unhealthy" for event in events)
    assert any(event.type == "session.failed" for event in events)
    assert not any(event.type == "session.completed" for event in events)


async def test_failed_session_close_fails_in_progress_tasks_and_releases_compute(
    tmp_path: Path,
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    repos = await _open_repos(tmp_path)
    workspace_id, project_id = await _seed_workspace_and_project(repos)
    session = await repos.sessions.create(
        session_id="S1", workspace_id=workspace_id, project_id=project_id
    )
    task = await _create_scientist_task(
        repos,
        project_id=project_id,
        task_id="T1",
        session_id=session.id,
    )
    await repos.tasks.update(
        task_id=task.id,
        status=TaskStatus.IN_PROGRESS,
        claimed_in_session_id=session.id,
    )
    await repos.tasks.set_workflow_id(task_id=task.id, workflow_id="task:T1:a1")
    target = await repos.compute_targets.register(
        target_id="CT1",
        pool=DEFAULT_LOCAL_POOL,
        kind=ComputeTargetKind.LOCAL,
        label=DEFAULT_LOCAL_LABEL,
    )
    claimed_target = await repos.compute_targets.claim_for_pool(
        pool=DEFAULT_LOCAL_POOL,
        task_id=task.id,
    )
    canceled_workflows: list[list[str]] = []

    async def fake_cancel_workflows(workflow_ids: list[str]) -> None:
        canceled_workflows.append(workflow_ids)

    monkeypatch.setattr(
        task_workflows.DBOS,
        "cancel_workflows_async",
        fake_cancel_workflows,
    )

    await task_workflows._close_session(
        repos=repos,
        session_id=session.id,
        event_type="session.failed",
        message="Session failed for test.",
        payload={"reason": "test"},
    )

    refreshed_session = await repos.sessions.get(session_id=session.id)
    refreshed_task = await repos.tasks.get(task_id=task.id)
    refreshed_target = await repos.compute_targets.get(target_id=target.id)
    events = await repos.events.list_for_session(session_id=session.id)

    assert claimed_target is not None
    assert canceled_workflows == [["task:T1:a1"]]
    assert refreshed_session is not None
    assert refreshed_session.status.value == "closed"
    assert refreshed_task is not None
    assert refreshed_task.status == TaskStatus.FAILED
    assert refreshed_task.workflow_id == "task:T1:a1"
    assert "Session failed for test." in (refreshed_task.result_summary or "")
    assert refreshed_target is not None
    assert refreshed_target.status == ComputeTargetStatus.IDLE
    assert refreshed_target.claimed_by_task_id is None
    assert any(event.type == "compute_target.released" for event in events)
    assert any(event.type == "session.failed" for event in events)


async def test_dispatch_sweep_handles_smoke_style_infrastructure_stall(
    tmp_path: Path,
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    repos = await _open_repos(tmp_path)
    workspace_id, project_id = await _seed_workspace_and_project(repos)
    session = await repos.sessions.create(
        session_id="S1", workspace_id=workspace_id, project_id=project_id
    )
    scientist = await repos.agents.create(
        agent_id="agent_P1_scientist",
        project_id=project_id,
        created_in_session_id=session.id,
        kind="scientist",
        display_name="Scientist",
    )
    await repos.compute_targets.register(pool="local", label="Slot 1")
    stale_task = await _create_scientist_task(
        repos,
        project_id=project_id,
        task_id="T1",
        session_id=session.id,
    )
    await repos.tasks.set_workflow_id(
        task_id=stale_task.id,
        workflow_id="task:T1:a1",
    )
    claimed_task = await repos.tasks.claim(
        task_id=stale_task.id,
        agent_id=scientist.id,
        eligible_kinds=[TaskKind.EXPERIMENT],
        claimed_in_session_id=session.id,
    )
    assert claimed_task is not None
    target = await repos.compute_targets.claim_for_pool(
        pool="local",
        task_id=stale_task.id,
    )
    assert target is not None

    old = (datetime.now(timezone.utc) - timedelta(hours=2)).isoformat()
    await repos.tasks.db.execute(
        "UPDATE tasks SET claimed_at = ?, updated_at = ? WHERE id = ?",
        (old, old, stale_task.id),
    )
    await repos.compute_targets.db.execute(
        """
        UPDATE compute_targets
        SET claimed_at = ?, last_heartbeat = ?, updated_at = ?
        WHERE id = ?
        """,
        (old, old, old, target.id),
    )

    for index in range(2, 5):
        task = await repos.tasks.create(
            task_id=f"T{index}",
            project_id=project_id,
            created_in_session_id=session.id,
            title=f"Queued task {index}",
            content="This workflow never claimed the task.",
            kind=TaskKind.PLAN,
            priority="high",
            source_kind="system",
        )
        await repos.tasks.set_workflow_id(
            task_id=task.id,
            workflow_id=f"task:{task.id}:a1",
        )
        await repos.tasks.db.execute(
            "UPDATE tasks SET updated_at = ? WHERE id = ?",
            (old, task.id),
        )

    runnable = await repos.tasks.create(
        task_id="T5",
        project_id=project_id,
        created_in_session_id=session.id,
        title="Should not dispatch after scheduler unhealthy",
        content="Runnable only if the session remains active.",
        kind=TaskKind.PLAN,
        priority="normal",
        source_kind="system",
    )
    enqueue_calls: list[str] = []

    class PendingWorkflow:
        status = WorkflowStatusString.PENDING
        name = "situ.task.run_manager"
        error = None

    async def fake_status_getter(_workflow_id: str) -> PendingWorkflow:
        return PendingWorkflow()

    async def fake_enqueue_task(**kwargs: Any) -> bool:
        enqueue_calls.append(kwargs["task"].id)
        return True

    monkeypatch.setattr(
        task_workflows.DBOS,
        "get_workflow_status_async",
        fake_status_getter,
    )
    monkeypatch.setattr(task_workflows, "enqueue_task", fake_enqueue_task)

    outcome = await task_workflows._run_task_dispatch_sweep_once(
        repos=repos,
        home=tmp_path / "home",
        app_root=None,
    )

    refreshed_session = await repos.sessions.get(session_id=session.id)
    refreshed_target = await repos.compute_targets.get(target_id=target.id)
    stale_task = await repos.tasks.get(task_id=stale_task.id)
    runnable = await repos.tasks.get(task_id=runnable.id)
    events = await repos.events.list_for_session(session_id=session.id)

    assert outcome["orphan_leases_released_count"] == 1
    assert outcome["stuck_workflows_count"] == 3
    assert outcome["enqueued_count"] == 0
    assert enqueue_calls == []
    assert refreshed_session is not None
    assert refreshed_session.status == "closed"
    assert refreshed_target is not None
    assert refreshed_target.status == ComputeTargetStatus.IDLE
    assert refreshed_target.claimed_by_task_id is None
    assert stale_task is not None
    assert stale_task.status == TaskStatus.FAILED
    assert stale_task.payload["last_infrastructure_failure"]["kind"] == (
        "stale_compute_lease"
    )
    assert runnable is not None
    assert runnable.status == TaskStatus.BACKLOG
    assert any(event.type == "session.scheduler_unhealthy" for event in events)
    assert any(event.type == "session.failed" for event in events)
    assert not any(event.type == "session.completed" for event in events)
    assert await check_state_invariants(repos) == []


async def test_critic_review_retries_transient_model_errors(
    tmp_path: Path,
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    repos = await _open_repos(tmp_path)
    workspace_id, project_id = await _seed_workspace_and_project(repos)
    session = await repos.sessions.create(
        session_id="S1", workspace_id=workspace_id, project_id=project_id
    )
    sentinel = object()
    sleeps: list[float] = []
    review_targets: list[str | None] = []
    review_work_item_ids: list[str | None] = []
    calls = 0

    class TransientModelError(Exception):
        status_code = 500

    async def fake_run_review(**kwargs: Any) -> object:
        nonlocal calls
        calls += 1
        review_targets.append(kwargs.get("assigned_review_target"))
        review_work_item_ids.append(kwargs.get("assigned_review_work_item_id"))
        if calls == 1:
            raise TransientModelError("temporary model failure")
        return sentinel

    async def fake_sleep(seconds: float) -> None:
        sleeps.append(seconds)

    monkeypatch.setattr(task_workflows.DBOS, "sleep_async", fake_sleep)

    result = await task_workflows._run_critic_review_with_retries(
        run_review=fake_run_review,
        repos=repos,
        workspace_payload={"id": workspace_id, "repo_path": str(tmp_path)},
        setup_objective="Test.",
        setup_research_context="Test.",
        session_id=session.id,
        project_id=project_id,
        app_root=None,
        assigned_review_target="baseline B1 (in_review)",
        assigned_review_work_item_id="WI1",
    )

    events = await repos.events.list_for_session(session_id=session.id)

    assert result is sentinel
    assert calls == 2
    assert review_targets == ["baseline B1 (in_review)", "baseline B1 (in_review)"]
    assert review_work_item_ids == ["WI1", "WI1"]
    assert sleeps == [5]
    assert any(event.type == "session.critic_retrying" for event in events)


async def test_recover_stalled_critic_reviews_enqueues_recovery_workflow(
    tmp_path: Path,
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    repos = await _open_repos(tmp_path)
    workspace_id, project_id = await _seed_workspace_and_project(repos)
    session = await repos.sessions.create(
        session_id="S1", workspace_id=workspace_id, project_id=project_id
    )
    await repos.baselines.create(
        baseline_id="B1",
        project_id=project_id,
        created_in_session_id=session.id,
        title="Pending baseline",
        summary="Needs Critic review.",
        status=RecordStatus.IN_REVIEW,
    )
    prefixes: list[str] = []
    calls: list[dict[str, str | None]] = []

    class FailedWorkflow:
        status = WorkflowStatusString.ERROR
        name = "situ.critic.review"
        error = RuntimeError("model failed")

    async def fake_workflow_lister(prefix: str) -> list[Any]:
        prefixes.append(prefix)
        return [FailedWorkflow()]

    async def fake_enqueue_critic_review(**kwargs: str | None) -> None:
        calls.append(kwargs)

    monkeypatch.setattr(
        task_workflows,
        "enqueue_critic_review",
        fake_enqueue_critic_review,
    )

    count = await task_workflows.recover_stalled_critic_reviews(
        repos=repos,
        home=str(tmp_path / "home"),
        app_root="/tmp/app",
        workflow_lister=fake_workflow_lister,
    )

    events = await repos.events.list_for_session(session_id=session.id)

    assert count == 1
    assert prefixes == ["critic-review:S1:"]
    assert calls == [
        {
            "session_id": session.id,
            "project_id": project_id,
            "trigger_id": "recovery:2",
            "workspace_root": str(tmp_path / "home"),
            "home": str(tmp_path / "home"),
            "app_root": "/tmp/app",
        }
    ]
    assert any(event.type == "session.critic_recovery_enqueued" for event in events)


async def test_recover_stalled_critic_reviews_skips_live_review_workflow(
    tmp_path: Path,
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    repos = await _open_repos(tmp_path)
    workspace_id, project_id = await _seed_workspace_and_project(repos)
    session = await repos.sessions.create(
        session_id="S1", workspace_id=workspace_id, project_id=project_id
    )
    await repos.baselines.create(
        baseline_id="B1",
        project_id=project_id,
        created_in_session_id=session.id,
        title="Pending baseline",
        summary="Needs Critic review.",
        status=RecordStatus.IN_REVIEW,
    )

    class LiveWorkflow:
        status = WorkflowStatusString.PENDING
        name = "situ.critic.review"
        error = None

    async def fake_workflow_lister(_prefix: str) -> list[Any]:
        return [LiveWorkflow()]

    async def fail_enqueue_critic_review(**_kwargs: Any) -> None:
        raise AssertionError("live Critic workflow should not be duplicated")

    monkeypatch.setattr(
        task_workflows,
        "enqueue_critic_review",
        fail_enqueue_critic_review,
    )

    count = await task_workflows.recover_stalled_critic_reviews(
        repos=repos,
        workflow_lister=fake_workflow_lister,
    )

    assert count == 0


async def test_park_for_compute_clears_workflow_id_and_sets_backoff(
    tmp_path: Path,
) -> None:
    repos = await _open_repos(tmp_path)
    await _seed_workspace_and_project(repos)
    task = await _create_scientist_task(repos, project_id="P1", task_id="T1")
    await repos.tasks.set_workflow_id(task_id=task.id, workflow_id="task:T1:a1")
    before = utc_now()

    await task_workflows._park_for_compute(
        repos=repos,
        task=await repos.tasks.get(task_id=task.id) or task,
    )

    parked = await repos.tasks.get(task_id=task.id)
    assert parked is not None
    assert parked.status == TaskStatus.BACKLOG
    assert parked.workflow_id is None
    assert parked.payload["compute_attempt"] == 2
    assert parked.payload["last_compute_wait_backoff_seconds"] == 5
    assert parked.available_at > before


async def test_compute_wait_backoff_is_exponential_and_capped() -> None:
    assert compute_wait_backoff_seconds(1) == 5
    assert compute_wait_backoff_seconds(2) == 10
    assert compute_wait_backoff_seconds(7) == 300
    assert compute_wait_backoff_seconds(100) == 300


# ---------------------------------------------------------------------------
# pool extraction from task payload
# ---------------------------------------------------------------------------


async def test_task_compute_pool_defaults_to_local(tmp_path: Path) -> None:
    repos = await _open_repos(tmp_path)
    await _seed_workspace_and_project(repos)
    task = await repos.tasks.create(
        task_id=await repos.tasks.next_id(project_id="P1"),
        project_id="P1",
        title="Run",
        content="Run.",
        kind=TaskKind.EXPERIMENT,
        priority="normal",
        source_kind="manager",
    )
    assert task_compute_pool(task) == "local"


async def test_task_compute_pool_reads_payload(tmp_path: Path) -> None:
    repos = await _open_repos(tmp_path)
    await _seed_workspace_and_project(repos)
    task = await _create_scientist_task(
        repos, project_id="P1", pool="h100", task_id="T7"
    )
    assert task_compute_pool(task) == "h100"
