"""Tests for HarnessApp wiring and the extracted task-execution helpers.

Original loop-driven tests were deleted with `_execute_session_async`. These
exercise the surfaces that survived the DBOS-queue cutover:

- session_start / session_resume invariants
- create_plan_task (no reuse — every plan is its own row)
- finish_task / claim_task helpers

Workflow-body integration tests are a separate workstream because they need
DBOS launched + a real or fake AgentRuntime.
"""
from __future__ import annotations

import asyncio
import subprocess
from pathlib import Path
from types import SimpleNamespace
from typing import Any

import pytest

from situ.harness.app import HarnessApp
from situ.harness.config import DEFAULTS
from situ.harness.core.critic_review import (
    claim_critic_review_work_item,
    finish_critic_review_work_item,
    has_pending_critic_records,
    list_pending_critic_records,
    sync_critic_review_work_items,
)
from situ.harness.core.dbos import task_workflows
from situ.harness.core.state_invariants import check_state_invariants
from situ.harness.core.task_execution import (
    capture_task_status_snapshot,
    claim_task,
    create_plan_task,
    finish_task,
    validate_task_status_progress,
)
from situ.harness.records import (
    AgentKind,
    ProjectStatus,
    RecordStatus,
    SessionStatus,
    TaskEntityKind,
    TaskKind,
    TaskStatus,
    WorkItemPurpose,
    WorkItemStatus,
)
from situ.harness.tools import build_critic_toolset

pytestmark = pytest.mark.asyncio


async def _noop_notify(_method: str, _params: dict[str, Any]) -> None:
    return None


@pytest.fixture(autouse=True)
def _stub_enqueue(monkeypatch: pytest.MonkeyPatch) -> None:
    """No-op enqueue for tests that don't exercise the DBOS queue.

    HarnessApp._enqueue_plan_task and create_plan_task callers fan out to
    `enqueue_task`, which in production registers a DBOS workflow. Tests
    that just verify task-row creation skip the queue entirely.
    """
    async def _noop(*_args: Any, **_kwargs: Any) -> None:
        return None

    monkeypatch.setattr("situ.harness.app.enqueue_task", _noop)


# ---------------------------------------------------------------------------
# session start / resume invariants
# ---------------------------------------------------------------------------


async def test_session_start_creates_fresh_project_per_session(
    tmp_path: Path,
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    workspace = tmp_path / "workspace"
    workspace.mkdir()
    app = await HarnessApp.create(
        workspace,
        app_root=Path.cwd(),
        project_home=tmp_path / "home",
        notify=_noop_notify,
    )
    monkeypatch.setattr(app, "_get_agent_runtime", _noop_get_agent_runtime)

    first = await app.session_start(
        {
            "objective": "Improve score",
            "research_context": "Run local evals.",
            "max_experiments": 1,
        }
    )
    second = await app.session_start(
        {
            "objective": "Improve score again",
            "research_context": "Run local evals again.",
            "max_experiments": 1,
        }
    )

    sessions = await app.repos.sessions.list_all()
    projects = await app.repos.projects.list_all()
    started_events = [
        event for event in await app.repos.events.list_all() if event.type == "session.started"
    ]

    assert [first["session_id"], second["session_id"]] == ["S1", "S2"]
    assert len(projects) == 2
    assert len(sessions) == 2
    assert [session.project_id for session in sessions] == [project.id for project in projects]
    assert [project.objective for project in projects] == [
        "Improve score",
        "Improve score again",
    ]
    assert [session.status.value for session in sessions] == ["closed", "active"]
    assert [event.associated_session_id for event in started_events] == ["S1", "S2"]


async def test_session_start_abandons_prior_active_session_owned_state(
    tmp_path: Path,
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    app, session_id, project_id = await _app_with_initial_plan(tmp_path)
    monkeypatch.setattr(app, "_get_agent_runtime", _noop_get_agent_runtime)
    scientist = await app.repos.agents.ensure_task_agent(
        project_id=project_id,
        task_id="T2",
        created_in_session_id=session_id,
        kind=AgentKind.SCIENTIST,
        display_name="Scientist T2",
    )
    task_row = await app.repos.tasks.create(
        task_id="T2",
        project_id=project_id,
        created_in_session_id=session_id,
        title="Run baseline",
        content="Create baseline evidence.",
        kind=TaskKind.BASELINE,
        priority="normal",
        source_kind="manager",
    )
    task = await app.repos.tasks.claim(
        task_id=task_row.id,
        agent_id=scientist.id,
        eligible_kinds=[TaskKind.BASELINE],
        claimed_in_session_id=session_id,
    )
    assert task is not None
    target = await app.repos.compute_targets.claim_for_pool(
        pool="local",
        task_id=task.id,
    )
    assert target is not None
    baseline = await app.repos.baselines.create(
        baseline_id="B1",
        project_id=project_id,
        created_in_session_id=session_id,
        title="Baseline",
        summary="Active baseline.",
        status=RecordStatus.ACTIVE,
    )
    evaluation = await app.repos.evaluations.create(
        evaluation_id="EV1",
        project_id=project_id,
        created_in_session_id=session_id,
        title="Baseline eval",
        summary="Active evaluation.",
        associated_baseline_id=baseline.id,
        status=RecordStatus.ACTIVE,
    )
    await app.repos.task_entity_links.create(
        project_id=project_id,
        task_id=task.id,
        entity_kind=TaskEntityKind.BASELINE,
        entity_id=baseline.id,
        relationship="created",
    )
    await app.repos.task_entity_links.create(
        project_id=project_id,
        task_id=task.id,
        entity_kind=TaskEntityKind.EVALUATION,
        entity_id=evaluation.id,
        relationship="created",
    )

    started = await app.session_start(
        {
            "objective": "Try again",
            "research_context": "Fresh run.",
            "max_experiments": 1,
        }
    )

    old_session = await app.repos.sessions.get(session_id=session_id)
    new_session = await app.repos.sessions.get(session_id=started["session_id"])
    finished_task = await app.repos.tasks.get(task_id=task.id)
    released = await app.repos.compute_targets.get(target_id=target.id)
    failed_baseline = await app.repos.baselines.get(baseline_id=baseline.id)
    failed_evaluation = await app.repos.evaluations.get(evaluation_id=evaluation.id)
    events = await app.repos.events.list_for_session(session_id=session_id)

    assert old_session is not None
    assert old_session.status.value == "closed"
    assert new_session is not None
    assert new_session.status.value == "active"
    assert finished_task is not None
    assert finished_task.status == TaskStatus.FAILED
    assert released is not None
    assert released.status.value == "idle"
    assert failed_baseline is not None
    assert failed_baseline.status == RecordStatus.FAILED
    assert failed_evaluation is not None
    assert failed_evaluation.status == RecordStatus.FAILED
    assert any(event.type == "session.abandoned" for event in events)


async def test_session_resume_enqueues_ready_critic_reviews(
    tmp_path: Path,
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    app, session_id, project_id = await _app_with_initial_plan(tmp_path)
    await app.repos.sessions.update_status(
        session_id=session_id,
        status=SessionStatus.CLOSED,
    )
    for index in range(1, 6):
        await app.repos.experiments.create(
            experiment_id=f"EX{index}",
            project_id=project_id,
            created_in_session_id=session_id,
            title=f"Submitted experiment {index}",
            summary="Ready for review.",
            status=RecordStatus.IN_REVIEW,
        )
    calls: list[dict[str, Any]] = []

    async def fake_enqueue_ready_critic_reviews(**kwargs: Any) -> int:
        calls.append(kwargs)
        return len(
            await app.repos.work_items.list_ready_for_project(
                project_id=project_id,
                purpose=WorkItemPurpose.CRITIC_REVIEW,
            )
        )

    async def fail_enqueue_plan_task(**_kwargs: Any) -> None:
        raise AssertionError("Manager plan should wait for pending Critic reviews")

    monkeypatch.setattr(app, "_get_agent_runtime", _noop_get_agent_runtime)
    monkeypatch.setattr(app, "_enqueue_plan_task", fail_enqueue_plan_task)
    monkeypatch.setattr(
        "situ.harness.app.enqueue_ready_critic_reviews",
        fake_enqueue_ready_critic_reviews,
    )

    result = await app.session_resume({"session_id": session_id})

    work_items = await app.repos.work_items.list_for_project(project_id=project_id)
    assert result == {"session_id": session_id, "status": "active"}
    assert len(calls) == 1
    assert calls[0]["session_id"] == session_id
    assert calls[0]["project_id"] == project_id
    assert calls[0]["trigger_id"].startswith("event:")
    assert [
        (item.target_kind, item.target_id, item.status)
        for item in work_items
    ] == [
        ("experiment", "EX1", WorkItemStatus.PENDING),
        ("experiment", "EX2", WorkItemStatus.PENDING),
        ("experiment", "EX3", WorkItemStatus.PENDING),
        ("experiment", "EX4", WorkItemStatus.PENDING),
        ("experiment", "EX5", WorkItemStatus.PENDING),
    ]


async def test_session_start_refuses_dirty_git_workspace_before_creating_records(
    tmp_path: Path,
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    workspace = tmp_path / "workspace"
    workspace.mkdir()
    _git(workspace, "init")
    (workspace / "dirty.txt").write_text("dirty\n")
    app = await HarnessApp.create(
        workspace,
        app_root=Path.cwd(),
        project_home=tmp_path / "home",
        notify=_noop_notify,
    )
    monkeypatch.setattr(app, "_get_agent_runtime", _noop_get_agent_runtime)

    with pytest.raises(
        RuntimeError,
        match="workspace must be clean before starting a Situ session",
    ):
        await app.session_start(
            {
                "objective": "Improve score",
                "research_context": "Run local evals.",
                "max_experiments": 1,
            }
        )

    assert await app.repos.projects.list_all() == []
    assert await app.repos.sessions.list_all() == []
    assert not [
        event for event in await app.repos.events.list_all() if event.type == "session.started"
    ]


async def test_session_setup_creates_only_persistent_manager_agent(
    tmp_path: Path,
) -> None:
    app, _session_id, project_id = await _app_with_initial_plan(tmp_path)

    agents = await app.repos.agents.list_for_project(project_id=project_id)

    assert [(agent.kind.value, agent.display_name) for agent in agents] == [
        ("manager", "Manager"),
    ]


# ---------------------------------------------------------------------------
# plan task creation: no reuse, every pass is its own row
# ---------------------------------------------------------------------------


async def test_create_plan_task_inserts_fresh_row_each_call(
    tmp_path: Path,
) -> None:
    app, session_id, project_id = await _app_with_initial_plan(tmp_path)

    first = await create_plan_task(
        app.repos,
        session_id=session_id,
        project_id=project_id,
        title="Plan after researcher pass",
        content="File the next focused task.",
    )
    second = await create_plan_task(
        app.repos,
        session_id=session_id,
        project_id=project_id,
        title="Plan after another researcher pass",
        content="File the next focused task.",
    )

    plan_tasks = [
        task
        for task in await app.repos.tasks.list_for_session(session_id=session_id)
        if task.kind == TaskKind.PLAN
    ]
    plan_ids = {task.id for task in plan_tasks}
    assert first.id != second.id
    assert {first.id, second.id}.issubset(plan_ids)
    # _app_with_initial_plan made one too, so we expect 3 total
    assert len(plan_tasks) == 3
    # Each row carries the trigger that produced it.
    assert second.payload["trigger_title"] == "Plan after another researcher pass"


async def test_create_plan_task_records_event_and_activity(
    tmp_path: Path,
) -> None:
    app, session_id, project_id = await _app_with_initial_plan(tmp_path)

    task = await create_plan_task(
        app.repos,
        session_id=session_id,
        project_id=project_id,
        title="Plan from critic review",
        content="Replan after Critic pass.",
    )

    activities = await app.repos.task_activities.list_for_task(task_id=task.id)
    activity_types = [activity.payload.get("activity_type") for activity in activities]
    assert activity_types == ["planning_task_queued"]

    created_events = [
        event
        for event in await app.repos.events.list_for_session(session_id=session_id)
        if event.type == "task.created" and event.payload.get("task_id") == task.id
    ]
    assert len(created_events) == 1


# ---------------------------------------------------------------------------
# status-driven Critic wakeup
# ---------------------------------------------------------------------------


async def test_pending_critic_records_are_derived_from_review_lane_statuses(
    tmp_path: Path,
) -> None:
    app, session_id, project_id = await _app_with_initial_plan(tmp_path)

    assert not await has_pending_critic_records(
        repos=app.repos,
        project_id=project_id,
    )

    await app.repos.analyses.create(
        analysis_id="A1",
        project_id=project_id,
        created_in_session_id=session_id,
        title="Candidate analysis",
        summary="Needs review.",
        content="Interpretation.",
        status=RecordStatus.TRIAGE,
    )
    await app.repos.baselines.create(
        baseline_id="B1",
        project_id=project_id,
        created_in_session_id=session_id,
        title="Baseline",
        summary="Ready for evidence review.",
        status=RecordStatus.IN_REVIEW,
    )
    await app.repos.experiments.create(
        experiment_id="EX1",
        project_id=project_id,
        created_in_session_id=session_id,
        title="Active experiment",
        summary="Still being worked.",
        status=RecordStatus.ACTIVE,
    )

    pending = await list_pending_critic_records(
        repos=app.repos,
        project_id=project_id,
    )

    assert [
        (record.kind, record.record_id, record.status)
        for record in pending
    ] == [
        ("analysis", "A1", RecordStatus.TRIAGE),
        ("baseline", "B1", RecordStatus.IN_REVIEW),
    ]
    assert await has_pending_critic_records(
        repos=app.repos,
        project_id=project_id,
    )


async def test_producer_handoff_enqueues_critic_when_review_lane_has_records(
    tmp_path: Path,
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    app, session_id, project_id = await _app_with_initial_plan(tmp_path)
    critic_calls: list[dict[str, str | None]] = []

    await app.repos.experiments.create(
        experiment_id="EX1",
        project_id=project_id,
        created_in_session_id=session_id,
        title="Submitted experiment",
        summary="Ready for review.",
        status=RecordStatus.IN_REVIEW,
    )

    async def fake_enqueue_critic_review(**kwargs: str | None) -> None:
        critic_calls.append(kwargs)

    async def fail_enqueue_task(**_kwargs: Any) -> None:
        raise AssertionError("Manager plan should wait for Critic review")

    monkeypatch.setattr(
        task_workflows,
        "enqueue_critic_review",
        fake_enqueue_critic_review,
    )
    monkeypatch.setattr(task_workflows, "enqueue_task", fail_enqueue_task)

    await task_workflows._continue_after_producer(
        repos=app.repos,
        session_id=session_id,
        project_id=project_id,
        workspace_root=str(app.context.repo_root),
        home=str(app.context.home),
        app_root=str(app.app_root),
        plan_title="Plan next step",
        plan_content="Should not enqueue yet.",
        trigger_id="T1",
    )

    assert critic_calls == [
        {
            "session_id": session_id,
            "project_id": project_id,
            "trigger_id": "T1",
            "workspace_root": str(app.context.repo_root),
            "home": str(app.context.home),
            "app_root": str(app.app_root),
        }
    ]


async def test_producer_handoff_enqueues_ready_critics_up_to_concurrency(
    tmp_path: Path,
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    app, session_id, project_id = await _app_with_initial_plan(tmp_path)
    critic_calls: list[dict[str, str | None]] = []

    for index in range(1, 6):
        await app.repos.experiments.create(
            experiment_id=f"EX{index}",
            project_id=project_id,
            created_in_session_id=session_id,
            title=f"Submitted experiment {index}",
            summary="Ready for review.",
            status=RecordStatus.IN_REVIEW,
        )

    async def fake_enqueue_critic_review(**kwargs: str | None) -> None:
        critic_calls.append(kwargs)

    async def fail_enqueue_task(**_kwargs: Any) -> None:
        raise AssertionError("Manager plan should wait for Critic review")

    monkeypatch.setattr(
        task_workflows,
        "enqueue_critic_review",
        fake_enqueue_critic_review,
    )
    monkeypatch.setattr(task_workflows, "enqueue_task", fail_enqueue_task)

    await task_workflows._continue_after_producer(
        repos=app.repos,
        session_id=session_id,
        project_id=project_id,
        workspace_root=str(app.context.repo_root),
        home=str(app.context.home),
        app_root=str(app.app_root),
        plan_title="Plan next step",
        plan_content="Should not enqueue yet.",
        trigger_id="T1",
    )

    assert DEFAULTS.critic_review_queue_concurrency == 4
    assert [call["trigger_id"] for call in critic_calls] == [
        "T1",
        "T1:WI2",
        "T1:WI3",
        "T1:WI4",
    ]


async def test_enqueue_ready_critic_reviews_reads_default_limit_at_call_time(
    tmp_path: Path,
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    app, session_id, project_id = await _app_with_initial_plan(tmp_path)
    critic_calls: list[dict[str, str | None]] = []

    for index in range(1, 4):
        await app.repos.experiments.create(
            experiment_id=f"EX{index}",
            project_id=project_id,
            created_in_session_id=session_id,
            title=f"Submitted experiment {index}",
            summary="Ready for review.",
            status=RecordStatus.IN_REVIEW,
        )
    await sync_critic_review_work_items(
        repos=app.repos,
        project_id=project_id,
        session_id=session_id,
    )

    async def fake_enqueue_critic_review(**kwargs: str | None) -> None:
        critic_calls.append(kwargs)

    monkeypatch.setattr(
        task_workflows,
        "DEFAULTS",
        SimpleNamespace(critic_review_queue_concurrency=2),
    )
    monkeypatch.setattr(
        task_workflows,
        "enqueue_critic_review",
        fake_enqueue_critic_review,
    )

    enqueued = await task_workflows.enqueue_ready_critic_reviews(
        repos=app.repos,
        session_id=session_id,
        project_id=project_id,
        trigger_id="critic-ready",
        workspace_root=str(app.context.repo_root),
        home=str(app.context.home),
        app_root=str(app.app_root),
    )

    assert enqueued == 2
    assert [call["trigger_id"] for call in critic_calls] == [
        "critic-ready",
        "critic-ready:WI2",
    ]


async def test_critic_review_work_items_claim_one_pending_record_at_a_time(
    tmp_path: Path,
) -> None:
    app, session_id, project_id = await _app_with_initial_plan(tmp_path)
    await app.repos.analyses.create(
        analysis_id="A1",
        project_id=project_id,
        created_in_session_id=session_id,
        created_by_agent_id=None,
        title="Pending analysis",
        summary="Needs admission.",
        content="Review me.",
        status=RecordStatus.TRIAGE,
    )
    await app.repos.baselines.create(
        baseline_id="B1",
        project_id=project_id,
        created_in_session_id=session_id,
        title="Submitted baseline",
        summary="Ready for evidence review.",
        status=RecordStatus.IN_REVIEW,
    )

    synced = await sync_critic_review_work_items(
        repos=app.repos,
        project_id=project_id,
        session_id=session_id,
    )
    first_claim = await claim_critic_review_work_item(
        repos=app.repos,
        project_id=project_id,
        session_id=session_id,
        owner_workflow_id="critic-review:S1:T1",
        lease_seconds=60,
    )

    assert [(item.target_kind, item.target_id) for item in synced] == [
        ("analysis", "A1"),
        ("baseline", "B1"),
    ]
    assert first_claim is not None
    assert first_claim.target.kind == "analysis"
    assert first_claim.target.record_id == "A1"
    assert first_claim.work_item.status == WorkItemStatus.CLAIMED

    await app.repos.analyses.update(
        analysis_id="A1",
        status=RecordStatus.ACCEPTED,
    )
    finished = await finish_critic_review_work_item(
        repos=app.repos,
        project_id=project_id,
        work_item=first_claim.work_item,
    )
    second_claim = await claim_critic_review_work_item(
        repos=app.repos,
        project_id=project_id,
        session_id=session_id,
        owner_workflow_id="critic-review:S1:T2",
        lease_seconds=60,
    )

    assert finished is not None
    assert finished.status == WorkItemStatus.DONE
    assert second_claim is not None
    assert second_claim.target.kind == "baseline"
    assert second_claim.target.record_id == "B1"


async def test_parallel_critic_review_claims_get_unique_targets(
    tmp_path: Path,
) -> None:
    app, session_id, project_id = await _app_with_initial_plan(tmp_path)
    for index in range(1, 9):
        await app.repos.experiments.create(
            experiment_id=f"EX{index}",
            project_id=project_id,
            created_in_session_id=session_id,
            title=f"Submitted experiment {index}",
            summary="Ready for review.",
            status=RecordStatus.IN_REVIEW,
        )
    await sync_critic_review_work_items(
        repos=app.repos,
        project_id=project_id,
        session_id=session_id,
    )

    claims = await asyncio.gather(
        *[
            claim_critic_review_work_item(
                repos=app.repos,
                project_id=project_id,
                session_id=session_id,
                owner_workflow_id=f"critic-review:S1:stress:{index}",
                lease_seconds=60,
            )
            for index in range(4)
        ]
    )

    assert all(claim is not None for claim in claims)
    target_ids = [
        claim.target.record_id
        for claim in claims
        if claim is not None
    ]
    work_item_ids = [
        claim.work_item.id
        for claim in claims
        if claim is not None
    ]
    assert len(set(target_ids)) == 4
    assert len(set(work_item_ids)) == 4
    assert all(target_id.startswith("EX") for target_id in target_ids)


async def test_long_run_dispatch_and_review_stress_without_llm(
    tmp_path: Path,
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    app, session_id, project_id = await _app_with_initial_plan(tmp_path)
    for task in await app.repos.tasks.list_for_project(project_id=project_id):
        await app.repos.tasks.update(task_id=task.id, status=TaskStatus.DONE)
    await app.repos.compute_targets.register(pool="local", label="Slot 2")
    hypothesis = await app.repos.hypotheses.create(
        hypothesis_id="H1",
        project_id=project_id,
        created_in_session_id=session_id,
        title="Fast candidate family",
        summary="A family of candidate changes worth testing.",
        status=RecordStatus.ACCEPTED,
    )
    for index in range(1, 41):
        await app.repos.tasks.create(
            task_id=await app.repos.tasks.next_id(project_id=project_id),
            project_id=project_id,
            created_in_session_id=session_id,
            title=f"Run candidate {index}",
            content="Run one candidate experiment.",
            kind=TaskKind.EXPERIMENT,
            priority="high",
            source_kind="manager",
            payload={
                "compute": {"pool": "local"},
                "hypothesis_ids": [hypothesis.id],
            },
        )

    enqueued_tasks: list[str] = []

    async def fake_enqueue_task(**kwargs: Any) -> bool:
        task = kwargs["task"]
        enqueued_tasks.append(task.id)
        return await app.repos.tasks.try_set_workflow_id(
            task_id=task.id,
            workflow_id=f"task:{task.id}:stress",
        )

    monkeypatch.setattr(task_workflows, "enqueue_task", fake_enqueue_task)

    enqueued = await task_workflows.dispatch_runnable_tasks(
        repos=app.repos,
        project_id=project_id,
        session_id=session_id,
        workspace_root=str(app.context.repo_root),
        home=str(app.context.home),
        app_root=str(app.app_root),
    )
    task_rows = [
        task
        for task in await app.repos.tasks.list_for_project(project_id=project_id)
        if task.kind == TaskKind.EXPERIMENT
    ]

    assert enqueued == 2
    assert len(enqueued_tasks) == 2
    assert len([task for task in task_rows if task.workflow_id is not None]) == 2
    assert len([task for task in task_rows if task.workflow_id is None]) == 38

    for index in range(1, 21):
        await app.repos.experiments.create(
            experiment_id=f"EX{index}",
            project_id=project_id,
            created_in_session_id=session_id,
            title=f"Submitted experiment {index}",
            summary="Ready for Critic review.",
            status=RecordStatus.IN_REVIEW,
        )
    await sync_critic_review_work_items(
        repos=app.repos,
        project_id=project_id,
        session_id=session_id,
    )
    critic_calls: list[dict[str, Any]] = []

    async def fake_enqueue_critic_review(**kwargs: Any) -> None:
        critic_calls.append(kwargs)

    monkeypatch.setattr(
        task_workflows,
        "enqueue_critic_review",
        fake_enqueue_critic_review,
    )

    review_limit = DEFAULTS.critic_review_queue_concurrency * 2
    critic_enqueued = await task_workflows.enqueue_ready_critic_reviews(
        repos=app.repos,
        session_id=session_id,
        project_id=project_id,
        trigger_id="stress-review",
        workspace_root=str(app.context.repo_root),
        home=str(app.context.home),
        app_root=str(app.app_root),
        limit=review_limit,
    )
    claims = await asyncio.gather(
        *[
            claim_critic_review_work_item(
                repos=app.repos,
                project_id=project_id,
                session_id=session_id,
                owner_workflow_id=f"critic-review:S1:stress:{index}",
                lease_seconds=60,
            )
            for index in range(review_limit)
        ]
    )
    claimed_targets = [
        claim.target.record_id
        for claim in claims
        if claim is not None
    ]

    assert critic_enqueued == review_limit
    assert len(critic_calls) == review_limit
    assert len(claimed_targets) == review_limit
    assert len(set(claimed_targets)) == review_limit


async def test_expired_critic_review_claim_can_be_reclaimed(
    tmp_path: Path,
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    app, session_id, project_id = await _app_with_initial_plan(tmp_path)
    await app.repos.baselines.create(
        baseline_id="B1",
        project_id=project_id,
        created_in_session_id=session_id,
        title="Submitted baseline",
        summary="Ready for evidence review.",
        status=RecordStatus.IN_REVIEW,
    )
    first_claim = await claim_critic_review_work_item(
        repos=app.repos,
        project_id=project_id,
        session_id=session_id,
        owner_workflow_id="critic-review:S1:expired",
        lease_seconds=60,
    )
    assert first_claim is not None
    await app.repos.work_items.db.execute(
        """
        UPDATE work_items
        SET lease_expires_at = ?, updated_at = ?
        WHERE id = ?
        """,
        (
            "1970-01-01T00:00:00+00:00",
            "1970-01-01T00:00:00+00:00",
            first_claim.work_item.id,
        ),
    )
    critic_calls: list[dict[str, Any]] = []

    async def fake_enqueue_critic_review(**kwargs: Any) -> None:
        critic_calls.append(kwargs)

    monkeypatch.setattr(
        task_workflows,
        "enqueue_critic_review",
        fake_enqueue_critic_review,
    )

    enqueued = await task_workflows.enqueue_ready_critic_reviews(
        repos=app.repos,
        session_id=session_id,
        project_id=project_id,
        trigger_id="resume",
        workspace_root=str(app.context.repo_root),
        home=str(app.context.home),
        app_root=str(app.app_root),
    )
    claims = await asyncio.gather(
        claim_critic_review_work_item(
            repos=app.repos,
            project_id=project_id,
            session_id=session_id,
            owner_workflow_id="critic-review:S1:new",
            lease_seconds=60,
        ),
        claim_critic_review_work_item(
            repos=app.repos,
            project_id=project_id,
            session_id=session_id,
            owner_workflow_id="critic-review:S1:duplicate",
            lease_seconds=60,
        ),
    )
    winners = [claim for claim in claims if claim is not None]

    assert enqueued == 1
    assert len(critic_calls) == 1
    assert len(winners) == 1
    reclaimed = winners[0]
    assert reclaimed.work_item.id == first_claim.work_item.id
    assert reclaimed.work_item.owner_workflow_id in {
        "critic-review:S1:new",
        "critic-review:S1:duplicate",
    }
    assert reclaimed.target.record_id == "B1"


async def test_critic_review_work_item_fails_after_noop_attempt_cap(
    tmp_path: Path,
) -> None:
    app, session_id, project_id = await _app_with_initial_plan(tmp_path)
    await app.repos.baselines.create(
        baseline_id="B1",
        project_id=project_id,
        created_in_session_id=session_id,
        title="Submitted baseline",
        summary="Still awaiting Critic review.",
        status=RecordStatus.IN_REVIEW,
    )

    first_claim = await claim_critic_review_work_item(
        repos=app.repos,
        project_id=project_id,
        session_id=session_id,
        owner_workflow_id="critic-review:S1:first",
        lease_seconds=60,
    )
    assert first_claim is not None

    requeued = await finish_critic_review_work_item(
        repos=app.repos,
        project_id=project_id,
        work_item=first_claim.work_item,
        max_noop_attempts=2,
    )
    assert requeued is not None
    assert requeued.status == WorkItemStatus.PENDING
    assert requeued.payload["last_pending_status"] == RecordStatus.IN_REVIEW.value

    second_claim = await claim_critic_review_work_item(
        repos=app.repos,
        project_id=project_id,
        session_id=session_id,
        owner_workflow_id="critic-review:S1:second",
        lease_seconds=60,
    )
    assert second_claim is not None

    failed = await finish_critic_review_work_item(
        repos=app.repos,
        project_id=project_id,
        work_item=second_claim.work_item,
        max_noop_attempts=2,
    )

    assert failed is not None
    assert failed.status == WorkItemStatus.FAILED
    assert failed.payload["completion_reason"] == "target_still_pending"
    assert failed.payload["last_pending_status"] == RecordStatus.IN_REVIEW.value
    assert failed.payload["max_noop_attempts"] == 2


async def test_critic_workflow_closes_session_when_noop_cap_is_reached(
    tmp_path: Path,
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    app, session_id, project_id = await _app_with_initial_plan(tmp_path)
    await app.repos.baselines.create(
        baseline_id="B1",
        project_id=project_id,
        created_in_session_id=session_id,
        title="Submitted baseline",
        summary="Still awaiting Critic review.",
        status=RecordStatus.IN_REVIEW,
    )

    class FakeReviewResult:
        summary = "No status changed."

        def model_dump(self) -> dict[str, Any]:
            return {"summary": self.summary}

    class FakeRuntime:
        async def run_review(self, **_kwargs: Any) -> FakeReviewResult:
            return FakeReviewResult()

    async def fake_get_agent_runtime(_project_dir: Path) -> FakeRuntime:
        return FakeRuntime()

    monkeypatch.setattr(
        "situ.harness.agent_runtime.get_agent_runtime",
        fake_get_agent_runtime,
    )
    monkeypatch.setattr(
        task_workflows,
        "DEFAULTS",
        SimpleNamespace(critic_review_max_noop_attempts=1),
    )

    await task_workflows.run_critic_review_workflow.__wrapped__.__wrapped__(
        session_id=session_id,
        project_id=project_id,
        workspace_root=str(app.context.repo_root),
        home=str(app.context.home),
        app_root=str(app.app_root),
    )

    refreshed = await app.repos.sessions.get(session_id=session_id)
    work_items = await app.repos.work_items.list_for_project(project_id=project_id)
    events = await app.repos.events.list_for_session(session_id=session_id)

    assert refreshed is not None
    assert refreshed.status == "closed"
    assert [item.status for item in work_items] == [WorkItemStatus.FAILED]
    assert any(event.type == "session.critic_stalled" for event in events)
    assert any(event.type == "session.failed" for event in events)
    assert not any(event.type == "session.critic_completed" for event in events)


async def test_producer_handoff_enqueues_manager_plan_when_no_review_is_pending(
    tmp_path: Path,
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    app, session_id, project_id = await _app_with_initial_plan(tmp_path)
    plan_calls: list[str] = []

    async def fail_enqueue_critic_review(**_kwargs: Any) -> None:
        raise AssertionError("Critic should not run without pending review records")

    async def fake_enqueue_task(**kwargs: Any) -> None:
        task = kwargs["task"]
        plan_calls.append(task.payload["trigger_title"])

    monkeypatch.setattr(
        task_workflows,
        "enqueue_critic_review",
        fail_enqueue_critic_review,
    )
    monkeypatch.setattr(task_workflows, "enqueue_task", fake_enqueue_task)

    await task_workflows._continue_after_producer(
        repos=app.repos,
        session_id=session_id,
        project_id=project_id,
        workspace_root=str(app.context.repo_root),
        home=str(app.context.home),
        app_root=str(app.app_root),
        plan_title="Plan next clean step",
        plan_content="No review is pending.",
        trigger_id="T1",
    )

    assert plan_calls == ["Plan next clean step"]


async def test_overenqueued_critic_with_no_work_returns_silently(
    tmp_path: Path,
) -> None:
    workspace = tmp_path / "workspace"
    workspace.mkdir()
    _git(workspace, "init")
    (workspace / "README.md").write_text("test workspace\n")
    _git(workspace, "add", ".")
    _commit(workspace, "initial")
    app = await HarnessApp.create(
        workspace,
        app_root=Path.cwd(),
        project_home=tmp_path / "home",
        notify=_noop_notify,
    )
    workspace_record = await app.repos.workspaces.ensure()
    project = await app.repos.projects.create(
        project_id="P1",
        workspace_id=workspace_record.id,
        title="Improve score",
        objective="Improve score.",
        research_context="Run local evals.",
    )
    session = await app.repos.sessions.create(
        session_id="S1",
        workspace_id=workspace_record.id,
        project_id=project.id,
    )

    await task_workflows.run_critic_review_workflow.__wrapped__.__wrapped__(
        session_id=session.id,
        project_id=project.id,
        workspace_root=str(app.context.repo_root),
        home=str(app.context.home),
        app_root=str(app.app_root),
    )

    refreshed = await app.repos.sessions.get(session_id=session.id)
    events = await app.repos.events.list_for_session(session_id=session.id)

    assert refreshed is not None
    assert refreshed.status == "active"
    assert events == []


async def test_critic_handoff_requeues_critic_when_review_lane_still_has_records(
    tmp_path: Path,
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    app, session_id, project_id = await _app_with_initial_plan(tmp_path)
    critic_calls: list[dict[str, str | None]] = []

    await app.repos.experiments.create(
        experiment_id="EX1",
        project_id=project_id,
        created_in_session_id=session_id,
        title="Still pending experiment",
        summary="Critic did not clear this record yet.",
        status=RecordStatus.IN_REVIEW,
    )

    async def fake_enqueue_critic_review(**kwargs: str | None) -> None:
        critic_calls.append(kwargs)

    async def fail_enqueue_task(**_kwargs: Any) -> None:
        raise AssertionError("Manager plan should wait until review lane is clear")

    monkeypatch.setattr(
        task_workflows,
        "enqueue_critic_review",
        fake_enqueue_critic_review,
    )
    monkeypatch.setattr(task_workflows, "enqueue_task", fail_enqueue_task)

    await task_workflows._continue_after_critic(
        repos=app.repos,
        session_id=session_id,
        project_id=project_id,
        workspace_root=str(app.context.repo_root),
        home=str(app.context.home),
        app_root=str(app.app_root),
        trigger_id="critic:42",
    )

    assert critic_calls == [
        {
            "session_id": session_id,
            "project_id": project_id,
            "trigger_id": "critic:42",
            "workspace_root": str(app.context.repo_root),
            "home": str(app.context.home),
            "app_root": str(app.app_root),
        }
    ]


async def test_critic_handoff_requeues_when_only_part_of_review_lane_cleared(
    tmp_path: Path,
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    app, session_id, project_id = await _app_with_initial_plan(tmp_path)
    critic_calls: list[dict[str, str | None]] = []
    baseline = await app.repos.baselines.create(
        baseline_id="B1",
        project_id=project_id,
        created_in_session_id=session_id,
        title="Submitted baseline",
        summary="Ready for Critic review.",
        status=RecordStatus.IN_REVIEW,
    )
    await app.repos.experiments.create(
        experiment_id="EX1",
        project_id=project_id,
        created_in_session_id=session_id,
        title="Submitted experiment",
        summary="Still waiting for Critic review.",
        status=RecordStatus.IN_REVIEW,
    )
    work_items = await sync_critic_review_work_items(
        repos=app.repos,
        project_id=project_id,
        session_id=session_id,
    )
    await app.repos.baselines.update(
        baseline_id=baseline.id,
        status=RecordStatus.DONE,
    )
    for work_item in work_items:
        if work_item.target_kind == "baseline":
            await finish_critic_review_work_item(
                repos=app.repos,
                project_id=project_id,
                work_item=work_item,
            )

    async def fake_enqueue_critic_review(**kwargs: str | None) -> None:
        critic_calls.append(kwargs)

    async def fail_enqueue_task(**_kwargs: Any) -> None:
        raise AssertionError("Manager plan should wait for the remaining review item")

    monkeypatch.setattr(
        task_workflows,
        "enqueue_critic_review",
        fake_enqueue_critic_review,
    )
    monkeypatch.setattr(task_workflows, "enqueue_task", fail_enqueue_task)

    await task_workflows._continue_after_critic(
        repos=app.repos,
        session_id=session_id,
        project_id=project_id,
        workspace_root=str(app.context.repo_root),
        home=str(app.context.home),
        app_root=str(app.app_root),
        trigger_id="critic:partial",
    )

    ready_items = await app.repos.work_items.list_ready_for_project(
        project_id=project_id,
        purpose=WorkItemPurpose.CRITIC_REVIEW,
    )
    assert await has_pending_critic_records(
        repos=app.repos,
        project_id=project_id,
    )
    assert [(item.target_kind, item.target_id) for item in ready_items] == [
        ("experiment", "EX1")
    ]
    assert [call["trigger_id"] for call in critic_calls] == ["critic:partial"]


async def test_critic_handoff_enqueues_manager_plan_when_review_lane_is_clear(
    tmp_path: Path,
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    app, session_id, project_id = await _app_with_initial_plan(tmp_path)
    plan_calls: list[str] = []

    async def fail_enqueue_critic_review(**_kwargs: Any) -> None:
        raise AssertionError("Critic should not requeue after clearing review lane")

    async def fake_enqueue_task(**kwargs: Any) -> None:
        task = kwargs["task"]
        plan_calls.append(task.payload["trigger_title"])

    monkeypatch.setattr(
        task_workflows,
        "enqueue_critic_review",
        fail_enqueue_critic_review,
    )
    monkeypatch.setattr(task_workflows, "enqueue_task", fake_enqueue_task)

    await task_workflows._continue_after_critic(
        repos=app.repos,
        session_id=session_id,
        project_id=project_id,
        workspace_root=str(app.context.repo_root),
        home=str(app.context.home),
        app_root=str(app.app_root),
        trigger_id="critic:42",
    )

    assert plan_calls == ["Plan from critic review"]


async def test_critic_handoff_enqueues_one_manager_plan_per_drain(
    tmp_path: Path,
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    app, session_id, project_id = await _app_with_initial_plan(tmp_path)
    plan_calls: list[str] = []

    baseline = await app.repos.baselines.create(
        baseline_id="B1",
        project_id=project_id,
        created_in_session_id=session_id,
        title="Submitted baseline",
        summary="Ready for Critic review.",
        status=RecordStatus.IN_REVIEW,
    )
    experiment = await app.repos.experiments.create(
        experiment_id="EX1",
        project_id=project_id,
        created_in_session_id=session_id,
        title="Submitted experiment",
        summary="Ready for Critic review.",
        status=RecordStatus.IN_REVIEW,
    )
    work_items = await sync_critic_review_work_items(
        repos=app.repos,
        project_id=project_id,
        session_id=session_id,
    )
    await app.repos.baselines.update(
        baseline_id=baseline.id,
        status=RecordStatus.DONE,
    )
    await app.repos.experiments.update(
        experiment_id=experiment.id,
        status=RecordStatus.DONE,
    )
    for work_item in work_items:
        await finish_critic_review_work_item(
            repos=app.repos,
            project_id=project_id,
            work_item=work_item,
        )

    async def fail_enqueue_critic_review(**_kwargs: Any) -> None:
        raise AssertionError("Critic should not requeue after clearing review lane")

    async def fake_enqueue_task(**kwargs: Any) -> None:
        task = kwargs["task"]
        plan_calls.append(task.payload["trigger_title"])

    monkeypatch.setattr(
        task_workflows,
        "enqueue_critic_review",
        fail_enqueue_critic_review,
    )
    monkeypatch.setattr(task_workflows, "enqueue_task", fake_enqueue_task)

    for _ in range(2):
        await task_workflows._continue_after_critic(
            repos=app.repos,
            session_id=session_id,
            project_id=project_id,
            workspace_root=str(app.context.repo_root),
            home=str(app.context.home),
            app_root=str(app.app_root),
            trigger_id="critic:42",
        )

    assert plan_calls == ["Plan from critic review"]


async def test_later_critic_drain_can_enqueue_another_manager_plan(
    tmp_path: Path,
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    app, session_id, project_id = await _app_with_initial_plan(tmp_path)
    plan_calls: list[str] = []

    async def fake_enqueue_task(**kwargs: Any) -> None:
        task = kwargs["task"]
        plan_calls.append(task.payload["trigger_title"])

    monkeypatch.setattr(task_workflows, "enqueue_task", fake_enqueue_task)

    async def clear_baseline_review(*, baseline_id: str) -> None:
        baseline = await app.repos.baselines.create(
            baseline_id=baseline_id,
            project_id=project_id,
            created_in_session_id=session_id,
            title=f"Submitted baseline {baseline_id}",
            summary="Ready for Critic review.",
            status=RecordStatus.IN_REVIEW,
        )
        work_items = await sync_critic_review_work_items(
            repos=app.repos,
            project_id=project_id,
            session_id=session_id,
        )
        await app.repos.baselines.update(
            baseline_id=baseline.id,
            status=RecordStatus.DONE,
        )
        for work_item in work_items:
            await finish_critic_review_work_item(
                repos=app.repos,
                project_id=project_id,
                work_item=work_item,
            )

    await clear_baseline_review(baseline_id="B1")
    await task_workflows._continue_after_critic(
        repos=app.repos,
        session_id=session_id,
        project_id=project_id,
        workspace_root=str(app.context.repo_root),
        home=str(app.context.home),
        app_root=str(app.app_root),
        trigger_id="critic:42",
    )

    await clear_baseline_review(baseline_id="B2")
    await task_workflows._continue_after_critic(
        repos=app.repos,
        session_id=session_id,
        project_id=project_id,
        workspace_root=str(app.context.repo_root),
        home=str(app.context.home),
        app_root=str(app.app_root),
        trigger_id="critic:43",
    )

    assert plan_calls == [
        "Plan from critic review",
        "Plan from critic review",
    ]


async def test_critic_toolset_has_no_task_mutation_tools() -> None:
    assert {
        "complete_task",
        "cancel_task",
        "fail_task",
        "update_task",
        "add_task_comment",
        "link_task_entity",
    }.isdisjoint(build_critic_toolset().tools)


async def test_critic_toolset_can_clear_every_review_lane() -> None:
    assert {
        "accept_analysis",
        "cancel_analysis",
        "accept_hypothesis",
        "cancel_hypothesis",
        "accept_baseline",
        "complete_baseline",
        "cancel_baseline",
        "accept_experiment",
        "complete_experiment",
        "cancel_experiment",
        "accept_evaluation",
        "complete_evaluation",
        "cancel_evaluation",
    }.issubset(build_critic_toolset().tools)


# ---------------------------------------------------------------------------
# artifact content RPC
# ---------------------------------------------------------------------------


async def test_artifacts_read_returns_patch_artifact_content(tmp_path: Path) -> None:
    app, session_id, project_id = await _app_with_initial_plan(tmp_path)
    patch_text = "\n".join(
        [
            "diff --git a/file.txt b/file.txt",
            "--- a/file.txt",
            "+++ b/file.txt",
            "@@ -1 +1 @@",
            "-old",
            "+new",
        ]
    )
    patch_dir = app.context.project_dir / "artifacts" / "patches" / project_id
    patch_dir.mkdir(parents=True)
    patch_path = patch_dir / "ART1-EX1.patch"
    patch_path.write_text(patch_text, encoding="utf-8")
    artifact = await app.repos.artifacts.create(
        artifact_id="ART1",
        project_id=project_id,
        created_in_session_id=session_id,
        associated_entity_kind="experiment",
        associated_entity_id="EX1",
        kind="patch",
        title="Patch handoff from EX1",
        path=str(patch_path.relative_to(app.context.project_dir)),
        media_type="text/x-patch",
        size_bytes=patch_path.stat().st_size,
    )

    result = await app.handle_async(
        "artifacts.read",
        {"artifact_id": artifact.id},
    )

    assert result["artifact_id"] == artifact.id
    assert result["media_type"] == "text/x-patch"
    assert result["content"] == patch_text
    assert result["truncated"] is False


async def test_artifacts_read_rejects_paths_outside_project_state(
    tmp_path: Path,
) -> None:
    app, session_id, project_id = await _app_with_initial_plan(tmp_path)
    await app.repos.artifacts.create(
        artifact_id="ART1",
        project_id=project_id,
        created_in_session_id=session_id,
        associated_entity_kind="experiment",
        associated_entity_id="EX1",
        kind="patch",
        title="Patch outside project",
        path="../outside.patch",
        media_type="text/x-patch",
    )

    with pytest.raises(ValueError, match="outside project state"):
        await app.handle_async("artifacts.read", {"artifact_id": "ART1"})


# ---------------------------------------------------------------------------
# status-progress task postconditions
# ---------------------------------------------------------------------------


async def test_manager_postcondition_fails_without_new_work_or_close(
    tmp_path: Path,
) -> None:
    app, _session_id, _project_id = await _app_with_initial_plan(tmp_path)
    plan_task = [
        task
        for task in await app.repos.tasks.list_all()
        if task.kind == TaskKind.PLAN
    ][0]

    snapshot = await capture_task_status_snapshot(repos=app.repos, task=plan_task)
    result = await validate_task_status_progress(
        repos=app.repos,
        snapshot=snapshot,
    )

    assert not result.ok
    assert "no Researcher or Scientist task" in result.reason


async def test_manager_postcondition_passes_when_producer_task_is_created(
    tmp_path: Path,
) -> None:
    app, session_id, project_id = await _app_with_initial_plan(tmp_path)
    plan_task = [
        task
        for task in await app.repos.tasks.list_all()
        if task.kind == TaskKind.PLAN
    ][0]
    snapshot = await capture_task_status_snapshot(repos=app.repos, task=plan_task)

    await app.repos.tasks.create(
        task_id=await app.repos.tasks.next_id(project_id=project_id),
        project_id=project_id,
        created_in_session_id=session_id,
        title="Inspect prior measurements",
        content="Produce reusable context.",
        kind=TaskKind.RESEARCH,
        priority="normal",
        source_kind="manager",
    )

    result = await validate_task_status_progress(
        repos=app.repos,
        snapshot=snapshot,
    )

    assert result.ok


async def test_manager_postcondition_passes_when_actionable_work_already_exists(
    tmp_path: Path,
) -> None:
    app, session_id, project_id = await _app_with_initial_plan(tmp_path)
    plan_task = [
        task
        for task in await app.repos.tasks.list_all()
        if task.kind == TaskKind.PLAN
    ][0]
    await app.repos.tasks.create(
        task_id=await app.repos.tasks.next_id(project_id=project_id),
        project_id=project_id,
        created_in_session_id=session_id,
        title="Run already planned candidate",
        content="Continue the existing experiment backlog.",
        kind=TaskKind.EXPERIMENT,
        priority="normal",
        source_kind="manager",
    )
    snapshot = await capture_task_status_snapshot(repos=app.repos, task=plan_task)

    result = await validate_task_status_progress(
        repos=app.repos,
        snapshot=snapshot,
    )

    assert result.ok
    assert "actionable work" in result.reason


async def test_manager_postcondition_passes_when_project_closes(
    tmp_path: Path,
) -> None:
    app, _session_id, project_id = await _app_with_initial_plan(tmp_path)
    plan_task = [
        task
        for task in await app.repos.tasks.list_all()
        if task.kind == TaskKind.PLAN
    ][0]
    snapshot = await capture_task_status_snapshot(repos=app.repos, task=plan_task)

    await app.repos.projects.update(
        project_id=project_id,
        status=ProjectStatus.CLOSED,
    )

    result = await validate_task_status_progress(
        repos=app.repos,
        snapshot=snapshot,
    )

    assert result.ok


async def test_manager_workflow_failed_postcondition_closes_session_as_failed(
    tmp_path: Path,
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    app, session_id, project_id = await _app_with_initial_plan(tmp_path)
    plan_task = [
        task
        for task in await app.repos.tasks.list_all()
        if task.kind == TaskKind.PLAN
    ][0]

    class NoopRuntime:
        model_name = "test-model"

        async def plan_session(self, **_kwargs: Any) -> Any:
            class Result:
                summary = "No task filed."

                def model_dump(self) -> dict[str, Any]:
                    return {"summary": self.summary}

            return Result()

    async def fake_runtime(_project_dir: Path) -> NoopRuntime:
        return NoopRuntime()

    monkeypatch.setattr(
        "situ.harness.agent_runtime.get_agent_runtime",
        fake_runtime,
    )

    await task_workflows._run_manager_workflow_body(
        context=app.context,
        repos=app.repos,
        task_id=plan_task.id,
        session_id=session_id,
        project_id=project_id,
    )

    finished_task = await app.repos.tasks.get(task_id=plan_task.id)
    session = await app.repos.sessions.get(session_id=session_id)
    failed_events = [
        event
        for event in await app.repos.events.list_for_session(session_id=session_id)
        if event.type == "session.failed"
    ]
    completed_events = [
        event
        for event in await app.repos.events.list_for_session(session_id=session_id)
        if event.type == "session.completed"
    ]

    assert finished_task is not None
    assert finished_task.status == TaskStatus.FAILED
    assert finished_task.result_summary.startswith("Task failed postcondition:")
    assert session is not None
    assert session.status.value == "closed"
    assert len(failed_events) == 1
    assert completed_events == []


async def test_manager_noop_with_remaining_work_finishes_without_closing_session(
    tmp_path: Path,
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    app, session_id, project_id = await _app_with_initial_plan(tmp_path)
    plan_task = [
        task
        for task in await app.repos.tasks.list_all()
        if task.kind == TaskKind.PLAN
    ][0]
    backlog_task = await app.repos.tasks.create(
        task_id=await app.repos.tasks.next_id(project_id=project_id),
        project_id=project_id,
        created_in_session_id=session_id,
        title="Run already planned candidate",
        content="Continue existing experiment backlog.",
        kind=TaskKind.EXPERIMENT,
        priority="normal",
        source_kind="manager",
    )

    class NoopRuntime:
        model_name = "test-model"

        async def plan_session(self, **_kwargs: Any) -> Any:
            class Result:
                summary = "Existing backlog is enough."

                def model_dump(self) -> dict[str, Any]:
                    return {"summary": self.summary}

            return Result()

    async def fake_runtime(_project_dir: Path) -> NoopRuntime:
        return NoopRuntime()

    monkeypatch.setattr(
        "situ.harness.agent_runtime.get_agent_runtime",
        fake_runtime,
    )

    await task_workflows._run_manager_workflow_body(
        context=app.context,
        repos=app.repos,
        task_id=plan_task.id,
        session_id=session_id,
        project_id=project_id,
    )

    finished_plan = await app.repos.tasks.get(task_id=plan_task.id)
    still_backlog = await app.repos.tasks.get(task_id=backlog_task.id)
    session = await app.repos.sessions.get(session_id=session_id)
    failed_events = [
        event
        for event in await app.repos.events.list_for_session(session_id=session_id)
        if event.type == "session.failed"
    ]

    assert finished_plan is not None
    assert finished_plan.status == TaskStatus.DONE
    assert still_backlog is not None
    assert still_backlog.status == TaskStatus.BACKLOG
    assert session is not None
    assert session.status == SessionStatus.ACTIVE
    assert failed_events == []


async def test_researcher_postcondition_passes_when_analysis_is_linked(
    tmp_path: Path,
) -> None:
    app, session_id, project_id = await _app_with_initial_plan(tmp_path)
    task = await app.repos.tasks.create(
        task_id=await app.repos.tasks.next_id(project_id=project_id),
        project_id=project_id,
        created_in_session_id=session_id,
        title="Map eval path",
        content="Find reusable context.",
        kind=TaskKind.RESEARCH,
        priority="normal",
        source_kind="manager",
    )
    snapshot = await capture_task_status_snapshot(repos=app.repos, task=task)
    analysis = await app.repos.analyses.create(
        analysis_id="A1",
        project_id=project_id,
        created_in_session_id=session_id,
        title="Eval path",
        summary="The eval path is known.",
        content="Reusable analysis.",
        status=RecordStatus.TRIAGE,
    )
    await app.repos.task_entity_links.create(
        project_id=project_id,
        task_id=task.id,
        entity_kind=TaskEntityKind.ANALYSIS,
        entity_id=analysis.id,
        relationship="produces",
    )

    result = await validate_task_status_progress(
        repos=app.repos,
        snapshot=snapshot,
    )

    assert result.ok


async def test_researcher_postcondition_fails_without_linked_record_progress(
    tmp_path: Path,
) -> None:
    app, session_id, project_id = await _app_with_initial_plan(tmp_path)
    task = await app.repos.tasks.create(
        task_id=await app.repos.tasks.next_id(project_id=project_id),
        project_id=project_id,
        created_in_session_id=session_id,
        title="Map eval path",
        content="Find reusable context.",
        kind=TaskKind.RESEARCH,
        priority="normal",
        source_kind="manager",
    )

    snapshot = await capture_task_status_snapshot(repos=app.repos, task=task)
    result = await validate_task_status_progress(
        repos=app.repos,
        snapshot=snapshot,
    )

    assert not result.ok
    assert "no linked analysis or hypothesis" in result.reason


async def test_researcher_postcondition_rejects_linking_old_analysis_without_status_change(
    tmp_path: Path,
) -> None:
    app, session_id, project_id = await _app_with_initial_plan(tmp_path)
    analysis = await app.repos.analyses.create(
        analysis_id="A1",
        project_id=project_id,
        created_in_session_id=session_id,
        title="Existing analysis",
        summary="Already existed.",
        content="Old reusable context.",
        status=RecordStatus.TRIAGE,
    )
    task = await app.repos.tasks.create(
        task_id=await app.repos.tasks.next_id(project_id=project_id),
        project_id=project_id,
        created_in_session_id=session_id,
        title="Map eval path",
        content="Find reusable context.",
        kind=TaskKind.RESEARCH,
        priority="normal",
        source_kind="manager",
    )
    snapshot = await capture_task_status_snapshot(repos=app.repos, task=task)

    await app.repos.task_entity_links.create(
        project_id=project_id,
        task_id=task.id,
        entity_kind=TaskEntityKind.ANALYSIS,
        entity_id=analysis.id,
        relationship="references",
    )
    result = await validate_task_status_progress(
        repos=app.repos,
        snapshot=snapshot,
    )

    assert not result.ok
    assert "no linked analysis or hypothesis" in result.reason


async def test_scientist_experiment_postcondition_requires_review_or_terminal_status(
    tmp_path: Path,
) -> None:
    app, session_id, project_id = await _app_with_initial_plan(tmp_path)
    task = await app.repos.tasks.create(
        task_id=await app.repos.tasks.next_id(project_id=project_id),
        project_id=project_id,
        created_in_session_id=session_id,
        title="Try candidate",
        content="Run one candidate.",
        kind=TaskKind.EXPERIMENT,
        priority="normal",
        source_kind="manager",
    )
    experiment = await app.repos.experiments.create(
        experiment_id="EX1",
        project_id=project_id,
        created_in_session_id=session_id,
        title="Candidate",
        summary="One candidate.",
        status=RecordStatus.ACTIVE,
    )
    await app.repos.task_entity_links.create(
        project_id=project_id,
        task_id=task.id,
        entity_kind=TaskEntityKind.EXPERIMENT,
        entity_id=experiment.id,
        relationship="produces",
    )
    snapshot = await capture_task_status_snapshot(repos=app.repos, task=task)

    failed = await validate_task_status_progress(
        repos=app.repos,
        snapshot=snapshot,
    )
    await app.repos.experiments.update(
        experiment_id=experiment.id,
        status=RecordStatus.IN_REVIEW,
    )
    passed = await validate_task_status_progress(
        repos=app.repos,
        snapshot=snapshot,
    )

    assert not failed.ok
    assert passed.ok


async def test_scientist_postcondition_rejects_linking_old_in_review_evaluation(
    tmp_path: Path,
) -> None:
    app, session_id, project_id = await _app_with_initial_plan(tmp_path)
    experiment = await app.repos.experiments.create(
        experiment_id="EX1",
        project_id=project_id,
        created_in_session_id=session_id,
        title="Existing experiment",
        summary="Older candidate.",
        status=RecordStatus.IN_REVIEW,
    )
    evaluation = await app.repos.evaluations.create(
        evaluation_id="EV1",
        project_id=project_id,
        created_in_session_id=session_id,
        title="Existing evaluation",
        summary="Already waiting for review.",
        associated_experiment_id=experiment.id,
        status=RecordStatus.IN_REVIEW,
    )
    task = await app.repos.tasks.create(
        task_id=await app.repos.tasks.next_id(project_id=project_id),
        project_id=project_id,
        created_in_session_id=session_id,
        title="Try candidate",
        content="Run one candidate.",
        kind=TaskKind.EXPERIMENT,
        priority="normal",
        source_kind="manager",
    )
    snapshot = await capture_task_status_snapshot(repos=app.repos, task=task)

    await app.repos.task_entity_links.create(
        project_id=project_id,
        task_id=task.id,
        entity_kind=TaskEntityKind.EVALUATION,
        entity_id=evaluation.id,
        relationship="references",
    )
    result = await validate_task_status_progress(
        repos=app.repos,
        snapshot=snapshot,
    )

    assert not result.ok
    assert "no linked experiment or evaluation" in result.reason


async def test_failed_postcondition_overrides_bogus_task_completion(
    tmp_path: Path,
) -> None:
    app, session_id, project_id = await _app_with_initial_plan(tmp_path)
    task_row = await app.repos.tasks.create(
        task_id=await app.repos.tasks.next_id(project_id=project_id),
        project_id=project_id,
        created_in_session_id=session_id,
        title="Try candidate",
        content="Run one candidate.",
        kind=TaskKind.EXPERIMENT,
        priority="normal",
        source_kind="manager",
    )
    claimed = await claim_task(
        repos=app.repos,
        task_id=task_row.id,
        session_id=session_id,
        project_id=project_id,
        agent_kind=AgentKind.SCIENTIST,
    )
    assert claimed is not None
    task, _agent = claimed
    experiment = await app.repos.experiments.create(
        experiment_id="EX1",
        project_id=project_id,
        created_in_session_id=session_id,
        title="Candidate",
        summary="One candidate.",
        status=RecordStatus.ACTIVE,
    )
    await app.repos.task_entity_links.create(
        project_id=project_id,
        task_id=task.id,
        entity_kind=TaskEntityKind.EXPERIMENT,
        entity_id=experiment.id,
        relationship="produces",
    )
    snapshot = await capture_task_status_snapshot(repos=app.repos, task=task)

    await finish_task(
        repos=app.repos,
        task=task,
        session_id=session_id,
        status=TaskStatus.DONE,
        result_summary="Agent called complete_task without submitting evidence.",
    )
    ok = await task_workflows._finish_task_after_agent_pass(
        repos=app.repos,
        task=task,
        session_id=session_id,
        snapshot=snapshot,
        result_summary="Agent returned.",
    )

    finished = await app.repos.tasks.get(task_id=task.id)
    assert not ok.ok
    assert finished is not None
    assert finished.status == TaskStatus.FAILED
    assert finished.result_summary.startswith("Task failed postcondition:")


async def test_failed_scientist_postcondition_fails_owned_evidence_records(
    tmp_path: Path,
) -> None:
    app, session_id, project_id = await _app_with_initial_plan(tmp_path)
    task_row = await app.repos.tasks.create(
        task_id=await app.repos.tasks.next_id(project_id=project_id),
        project_id=project_id,
        created_in_session_id=session_id,
        title="Try candidate",
        content="Run one candidate.",
        kind=TaskKind.EXPERIMENT,
        priority="normal",
        source_kind="manager",
    )
    claimed = await claim_task(
        repos=app.repos,
        task_id=task_row.id,
        session_id=session_id,
        project_id=project_id,
        agent_kind=AgentKind.SCIENTIST,
    )
    assert claimed is not None
    task, _agent = claimed
    experiment = await app.repos.experiments.create(
        experiment_id="EX1",
        project_id=project_id,
        created_in_session_id=session_id,
        title="Candidate",
        summary="Still active after a no-op agent pass.",
        status=RecordStatus.ACTIVE,
    )
    evaluation = await app.repos.evaluations.create(
        evaluation_id="EV1",
        project_id=project_id,
        created_in_session_id=session_id,
        title="Candidate eval",
        summary="Still active after a no-op agent pass.",
        associated_experiment_id=experiment.id,
        status=RecordStatus.ACTIVE,
    )
    await app.repos.task_entity_links.create(
        project_id=project_id,
        task_id=task.id,
        entity_kind=TaskEntityKind.EXPERIMENT,
        entity_id=experiment.id,
        relationship="created",
    )
    await app.repos.task_entity_links.create(
        project_id=project_id,
        task_id=task.id,
        entity_kind=TaskEntityKind.EVALUATION,
        entity_id=evaluation.id,
        relationship="created",
    )
    snapshot = await capture_task_status_snapshot(repos=app.repos, task=task)

    finish = await task_workflows._finish_task_after_agent_pass(
        repos=app.repos,
        task=task,
        session_id=session_id,
        snapshot=snapshot,
        result_summary="Agent returned without submitting evidence.",
    )

    assert not finish.ok
    failed_experiment = await app.repos.experiments.get(experiment_id=experiment.id)
    failed_evaluation = await app.repos.evaluations.get(evaluation_id=evaluation.id)
    assert failed_experiment is not None
    assert failed_experiment.status == RecordStatus.FAILED
    assert failed_evaluation is not None
    assert failed_evaluation.status == RecordStatus.FAILED
    violations = await check_state_invariants(app.repos)
    assert [
        violation
        for violation in violations
        if violation.record_id in {experiment.id, evaluation.id}
    ] == []


async def test_failed_baseline_postcondition_fails_owned_evidence_records(
    tmp_path: Path,
) -> None:
    app, session_id, project_id = await _app_with_initial_plan(tmp_path)
    task_row = await app.repos.tasks.create(
        task_id=await app.repos.tasks.next_id(project_id=project_id),
        project_id=project_id,
        created_in_session_id=session_id,
        title="Measure baseline",
        content="Run the baseline measurement.",
        kind=TaskKind.BASELINE,
        priority="normal",
        source_kind="manager",
    )
    claimed = await claim_task(
        repos=app.repos,
        task_id=task_row.id,
        session_id=session_id,
        project_id=project_id,
        agent_kind=AgentKind.SCIENTIST,
    )
    assert claimed is not None
    task, _agent = claimed
    baseline = await app.repos.baselines.create(
        baseline_id="B1",
        project_id=project_id,
        created_in_session_id=session_id,
        title="Baseline",
        summary="Still active after a no-op agent pass.",
        status=RecordStatus.ACTIVE,
    )
    evaluation = await app.repos.evaluations.create(
        evaluation_id="EV1",
        project_id=project_id,
        created_in_session_id=session_id,
        title="Baseline eval",
        summary="Still active after a no-op agent pass.",
        associated_baseline_id=baseline.id,
        status=RecordStatus.ACTIVE,
    )
    await app.repos.task_entity_links.create(
        project_id=project_id,
        task_id=task.id,
        entity_kind=TaskEntityKind.BASELINE,
        entity_id=baseline.id,
        relationship="created",
    )
    await app.repos.task_entity_links.create(
        project_id=project_id,
        task_id=task.id,
        entity_kind=TaskEntityKind.EVALUATION,
        entity_id=evaluation.id,
        relationship="created",
    )
    snapshot = await capture_task_status_snapshot(repos=app.repos, task=task)

    finish = await task_workflows._finish_task_after_agent_pass(
        repos=app.repos,
        task=task,
        session_id=session_id,
        snapshot=snapshot,
        result_summary="Agent returned without submitting baseline evidence.",
    )

    failed_baseline = await app.repos.baselines.get(baseline_id=baseline.id)
    failed_evaluation = await app.repos.evaluations.get(
        evaluation_id=evaluation.id,
    )
    assert not finish.ok
    assert failed_baseline is not None
    assert failed_baseline.status == RecordStatus.FAILED
    assert failed_evaluation is not None
    assert failed_evaluation.status == RecordStatus.FAILED
    violations = await check_state_invariants(app.repos)
    assert [
        violation
        for violation in violations
        if violation.record_id in {baseline.id, evaluation.id}
    ] == []


async def test_explicit_task_failure_satisfies_postcondition(
    tmp_path: Path,
) -> None:
    app, session_id, project_id = await _app_with_initial_plan(tmp_path)
    task_row = await app.repos.tasks.create(
        task_id=await app.repos.tasks.next_id(project_id=project_id),
        project_id=project_id,
        created_in_session_id=session_id,
        title="Try candidate",
        content="Run one candidate.",
        kind=TaskKind.EXPERIMENT,
        priority="normal",
        source_kind="manager",
    )
    claimed = await claim_task(
        repos=app.repos,
        task_id=task_row.id,
        session_id=session_id,
        project_id=project_id,
        agent_kind=AgentKind.SCIENTIST,
    )
    assert claimed is not None
    task, _agent = claimed
    snapshot = await capture_task_status_snapshot(repos=app.repos, task=task)

    await finish_task(
        repos=app.repos,
        task=task,
        session_id=session_id,
        status=TaskStatus.FAILED,
        result_summary="Agent could not find a valid eval command.",
    )
    ok = await task_workflows._finish_task_after_agent_pass(
        repos=app.repos,
        task=task,
        session_id=session_id,
        snapshot=snapshot,
        result_summary="Agent returned.",
    )

    finished = await app.repos.tasks.get(task_id=task.id)
    assert ok.ok
    assert finished is not None
    assert finished.status == TaskStatus.FAILED
    assert finished.result_summary == "Agent could not find a valid eval command."


# ---------------------------------------------------------------------------
# session drain invariants
# ---------------------------------------------------------------------------


async def test_maybe_close_session_fails_if_open_evidence_remains(
    tmp_path: Path,
) -> None:
    app, session_id, project_id = await _app_with_initial_plan(tmp_path)
    for task in await app.repos.tasks.list_for_project(project_id=project_id):
        await app.repos.tasks.update(task_id=task.id, status=TaskStatus.DONE)
    await app.repos.baselines.create(
        baseline_id="B1",
        project_id=project_id,
        created_in_session_id=session_id,
        title="Unfinished baseline",
        summary="This record is still active.",
        status=RecordStatus.ACTIVE,
    )

    await task_workflows._maybe_close_session(
        app.repos,
        session_id=session_id,
        project_id=project_id,
    )

    session = await app.repos.sessions.get(session_id=session_id)
    events = await app.repos.events.list_for_session(session_id=session_id)
    failed = [event for event in events if event.type == "session.failed"]
    assert session is not None
    assert session.status.value == "closed"
    assert len(failed) == 1
    assert failed[0].payload["reason"] == "open_evidence_records"
    assert failed[0].payload["open_records"] == [
        {"kind": "baseline", "record_id": "B1", "status": "active"}
    ]


async def test_maybe_close_session_records_selected_patch_handoff(
    tmp_path: Path,
) -> None:
    app, session_id, project_id = await _app_with_initial_plan(tmp_path)
    for task in await app.repos.tasks.list_for_project(project_id=project_id):
        await app.repos.tasks.update(task_id=task.id, status=TaskStatus.DONE)
    experiment = await app.repos.experiments.create(
        experiment_id="EX1",
        project_id=project_id,
        created_in_session_id=session_id,
        title="Reviewed candidate",
        summary="This candidate is the current best.",
        status=RecordStatus.DONE,
    )
    patch_dir = app.context.project_dir / "artifacts" / "patches" / project_id
    patch_dir.mkdir(parents=True)
    patch_path = patch_dir / "ART1-EX1.patch"
    patch_path.write_text("diff --git a/a b/a\n", encoding="utf-8")
    await app.repos.artifacts.create(
        artifact_id="ART1",
        project_id=project_id,
        created_in_session_id=session_id,
        associated_entity_kind="experiment",
        associated_entity_id=experiment.id,
        kind="patch",
        title="Patch handoff from EX1",
        path=str(patch_path.relative_to(app.context.project_dir)),
        media_type="text/x-patch",
        size_bytes=patch_path.stat().st_size,
    )
    await app.repos.experiment_activities.add(
        experiment_id=experiment.id,
        created_in_session_id=session_id,
        actor="manager",
        kind="recorded",
        body="Continue from this candidate.",
        payload={"record_type": "lineage_decision", "decision": "continue"},
    )

    await task_workflows._maybe_close_session(
        app.repos,
        session_id=session_id,
        project_id=project_id,
    )

    events = await app.repos.events.list_for_session(session_id=session_id)
    selected_events = [
        event for event in events if event.type == "session.selected_patch"
    ]
    completed_events = [
        event for event in events if event.type == "session.completed"
    ]
    activities = await app.repos.experiment_activities.list_for_experiment(
        experiment_id=experiment.id,
    )
    assert [event.payload["artifact_id"] for event in selected_events] == ["ART1"]
    assert completed_events[-1].payload["selected_patch_artifact_id"] == "ART1"
    assert activities[-1].payload["record_type"] == "selected_patch"
    assert activities[-1].payload["apply_command"] == "situ apply ART1"


async def test_selected_patch_handoff_ignores_later_reproduce_lineage_decision(
    tmp_path: Path,
) -> None:
    app, session_id, project_id = await _app_with_initial_plan(tmp_path)
    for task in await app.repos.tasks.list_for_project(project_id=project_id):
        await app.repos.tasks.update(task_id=task.id, status=TaskStatus.DONE)
    continued = await app.repos.experiments.create(
        experiment_id="EX1",
        project_id=project_id,
        created_in_session_id=session_id,
        title="Best reviewed candidate",
        summary="This candidate should be the patch handoff.",
        status=RecordStatus.DONE,
        candidate_commit="abc1234",
        research_thread="architecture",
    )
    reproduction = await app.repos.experiments.create(
        experiment_id="EX2",
        project_id=project_id,
        created_in_session_id=session_id,
        title="Reproduce the best candidate",
        summary="This is a confirmation run, not the next patch handoff.",
        status=RecordStatus.DONE,
        candidate_commit="def5678",
        parent_experiment_id=continued.id,
        research_thread="architecture",
    )
    await _create_patch_artifact(
        app=app,
        project_id=project_id,
        session_id=session_id,
        experiment_id=continued.id,
        artifact_id="ART1",
    )
    await _create_patch_artifact(
        app=app,
        project_id=project_id,
        session_id=session_id,
        experiment_id=reproduction.id,
        artifact_id="ART2",
    )
    await app.repos.experiment_activities.add(
        experiment_id=continued.id,
        created_in_session_id=session_id,
        actor="manager",
        kind="recorded",
        body="Keep building from this candidate.",
        payload={"record_type": "lineage_decision", "decision": "continue"},
    )
    await app.repos.experiment_activities.add(
        experiment_id=reproduction.id,
        created_in_session_id=session_id,
        actor="manager",
        kind="recorded",
        body="Reproduce this result before advancing the spine.",
        payload={"record_type": "lineage_decision", "decision": "reproduce"},
    )

    await task_workflows._maybe_close_session(
        app.repos,
        session_id=session_id,
        project_id=project_id,
    )

    events = await app.repos.events.list_for_session(session_id=session_id)
    selected_events = [
        event for event in events if event.type == "session.selected_patch"
    ]
    completed_events = [
        event for event in events if event.type == "session.completed"
    ]

    assert [event.payload["artifact_id"] for event in selected_events] == ["ART1"]
    assert selected_events[-1].payload["experiment_id"] == continued.id
    assert completed_events[-1].payload["selected_patch_artifact_id"] == "ART1"


# ---------------------------------------------------------------------------
# claim_task / finish_task helpers
# ---------------------------------------------------------------------------


async def test_claim_task_atomically_claims_and_activates_agent(
    tmp_path: Path,
) -> None:
    app, session_id, project_id = await _app_with_initial_plan(tmp_path)
    task_row = await app.repos.tasks.create(
        task_id=await app.repos.tasks.next_id(project_id=project_id),
        project_id=project_id,
        created_in_session_id=session_id,
        title="Investigate component A",
        content="Read related code.",
        kind=TaskKind.RESEARCH,
        priority="normal",
        source_kind="system",
    )

    claimed = await claim_task(
        repos=app.repos,
        task_id=task_row.id,
        session_id=session_id,
        project_id=project_id,
        agent_kind=AgentKind.RESEARCHER,
    )

    assert claimed is not None
    task, agent = claimed
    assert task.status == TaskStatus.IN_PROGRESS
    assert task.assignee_id == agent.id
    assert agent.status == "active"

    # Second claim against an in-progress row returns None.
    again = await claim_task(
        repos=app.repos,
        task_id=task_row.id,
        session_id=session_id,
        project_id=project_id,
        agent_kind=AgentKind.RESEARCHER,
    )
    assert again is None


async def test_finish_task_marks_done_and_idles_agent(
    tmp_path: Path,
) -> None:
    app, session_id, project_id = await _app_with_initial_plan(tmp_path)
    task_row = await app.repos.tasks.create(
        task_id=await app.repos.tasks.next_id(project_id=project_id),
        project_id=project_id,
        created_in_session_id=session_id,
        title="Investigate component A",
        content="Read related code.",
        kind=TaskKind.RESEARCH,
        priority="normal",
        source_kind="system",
    )
    claimed = await claim_task(
        repos=app.repos,
        task_id=task_row.id,
        session_id=session_id,
        project_id=project_id,
        agent_kind=AgentKind.RESEARCHER,
    )
    assert claimed is not None
    task, agent = claimed

    await finish_task(
        repos=app.repos,
        task=task,
        session_id=session_id,
        status=TaskStatus.DONE,
        result_summary="Read the code; no surprises.",
    )

    finished = await app.repos.tasks.get(task_id=task.id)
    assert finished is not None
    assert finished.status == TaskStatus.DONE
    assert finished.result_summary == "Read the code; no surprises."
    refreshed_agent = await app.repos.agents.get(agent_id=agent.id)
    assert refreshed_agent is not None
    assert refreshed_agent.status == "idle"


async def test_scientist_failure_after_experiment_prep_fails_experiment(
    tmp_path: Path,
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    app, session_id, project_id = await _app_with_initial_plan(tmp_path)

    task_id = await _seed_scientist_experiment_task(app, session_id, project_id)
    await _run_scientist_workflow_with_runtime_error(
        app=app,
        session_id=session_id,
        project_id=project_id,
        task_id=task_id,
        error=RuntimeError("runtime died after prep"),
        monkeypatch=monkeypatch,
    )

    task = await app.repos.tasks.get(task_id=task_id)
    experiments = await app.repos.experiments.list_for_project(project_id=project_id)
    targets = await app.repos.compute_targets.list_all()
    activities = await app.repos.experiment_activities.list_for_experiment(
        experiment_id=experiments[0].id,
    )

    assert task is not None
    assert task.status == TaskStatus.FAILED
    assert task.result_summary == "runtime died after prep"
    assert [(target.id, target.status.value, target.claimed_by_task_id) for target in targets] == [
        ("CT1", "idle", None)
    ]
    assert [(experiment.id, experiment.status.value) for experiment in experiments] == [
        ("EX1", "failed")
    ]
    assert any(
        activity.kind.value == "comment"
        and activity.body == "Captured final worktree state for EX1."
        for activity in activities
    )
    assert any(
        activity.kind.value == "status_updated"
        and activity.payload["to_status"] == "failed"
        for activity in activities
    )


async def test_scientist_token_limit_after_experiment_prep_fails_cleanly(
    tmp_path: Path,
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    app, session_id, project_id = await _app_with_initial_plan(tmp_path)
    task_id = await _seed_scientist_experiment_task(app, session_id, project_id)
    message = (
        "Model token limit (provider default) exceeded before any response "
        "was generated. Increase the `max_tokens` model setting."
    )

    await _run_scientist_workflow_with_runtime_error(
        app=app,
        session_id=session_id,
        project_id=project_id,
        task_id=task_id,
        error=RuntimeError(message),
        monkeypatch=monkeypatch,
    )

    task = await app.repos.tasks.get(task_id=task_id)
    experiments = await app.repos.experiments.list_for_project(project_id=project_id)

    assert task is not None
    assert task.status == TaskStatus.FAILED
    assert "Model token limit" in (task.result_summary or "")
    assert [(experiment.id, experiment.status.value) for experiment in experiments] == [
        ("EX1", "failed")
    ]


async def test_scientist_workflow_stops_writing_when_session_closes_mid_run(
    tmp_path: Path,
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    app, session_id, project_id = await _app_with_initial_plan(tmp_path)
    task_id = await _seed_scientist_experiment_task(app, session_id, project_id)

    class Result:
        summary = "Finished after session was closed elsewhere."

        def model_dump(self) -> dict[str, Any]:
            return {"summary": self.summary}

    class RuntimeThatClosesSession:
        model_name = "test-model"

        async def run_session(self, **_kwargs: Any) -> Result:
            await task_workflows._close_session(
                repos=app.repos,
                session_id=session_id,
                event_type="session.failed",
                message="Session failed elsewhere while Scientist was running.",
                payload={"reason": "test_mid_run_close"},
            )
            return Result()

    async def fake_get_agent_runtime(_project_dir: Path) -> RuntimeThatClosesSession:
        return RuntimeThatClosesSession()

    monkeypatch.setattr(
        "situ.harness.agent_runtime.get_agent_runtime",
        fake_get_agent_runtime,
    )

    await task_workflows.run_scientist_workflow.__wrapped__.__wrapped__(
        task_id=task_id,
        session_id=session_id,
        project_id=project_id,
        workspace_root=str(app.context.repo_root),
        home=str(app.context.home),
        app_root=str(app.app_root),
    )

    task = await app.repos.tasks.get(task_id=task_id)
    session = await app.repos.sessions.get(session_id=session_id)
    experiments = await app.repos.experiments.list_for_project(project_id=project_id)
    events = await app.repos.events.list_for_session(session_id=session_id)
    activities = await app.repos.experiment_activities.list_for_experiment(
        experiment_id=experiments[0].id,
    )

    assert task is not None
    assert task.status == TaskStatus.FAILED
    assert session is not None
    assert session.status == SessionStatus.CLOSED
    assert [(experiment.id, experiment.status.value) for experiment in experiments] == [
        ("EX1", "failed")
    ]
    assert not any(event.type == "session.agent_completed" for event in events)
    assert not any(event.type == "experiment.worktree_captured" for event in events)
    assert not any(
        activity.payload.get("activity_type") == "workspace_state"
        for activity in activities
    )


async def test_state_invariants_flag_unrecovered_smoke_style_states(
    tmp_path: Path,
) -> None:
    app, session_id, project_id = await _app_with_initial_plan(tmp_path)
    task = await app.repos.tasks.create(
        task_id=await app.repos.tasks.next_id(project_id=project_id),
        project_id=project_id,
        created_in_session_id=session_id,
        title="Failed experiment task",
        content="Failed after preparing an experiment.",
        kind=TaskKind.EXPERIMENT,
        priority="high",
        source_kind="system",
    )
    experiment = await app.repos.experiments.create(
        experiment_id="EX1",
        project_id=project_id,
        created_in_session_id=session_id,
        title="Orphan active experiment",
        summary="Still active despite failed task.",
        status=RecordStatus.ACTIVE,
    )
    await app.repos.task_entity_links.create(
        project_id=project_id,
        task_id=task.id,
        entity_kind=TaskEntityKind.EXPERIMENT,
        entity_id=experiment.id,
        relationship="produces",
    )
    await app.repos.tasks.update(
        task_id=task.id,
        status=TaskStatus.FAILED,
        result_summary="Failed before evidence.",
    )
    await app.repos.tasks.set_workflow_id(task_id=task.id, workflow_id="task:T2:a1")
    await app.repos.compute_targets.register(pool="local", label="Slot 1")
    claimed = await app.repos.compute_targets.claim_for_pool(
        pool="local",
        task_id=task.id,
    )
    assert claimed is not None
    await app.repos.baselines.create(
        baseline_id="B1",
        project_id=project_id,
        created_in_session_id=session_id,
        title="Submitted baseline",
        summary="Needs Critic review.",
        status=RecordStatus.IN_REVIEW,
    )

    violations = await check_state_invariants(app.repos)

    assert {violation.code for violation in violations} == {
        "active_evidence_without_live_task",
        "claimed_compute_target_invalid_owner",
        "pending_critic_record_without_work_item",
    }


# ---------------------------------------------------------------------------
# helpers
# ---------------------------------------------------------------------------


async def _noop_get_agent_runtime() -> Any:
    return None


async def _seed_scientist_experiment_task(
    app: HarnessApp,
    session_id: str,
    project_id: str,
) -> str:
    if not await app.repos.compute_targets.pool_exists(pool="local"):
        await app.repos.compute_targets.register(pool="local", label="Slot 1")
    hypothesis = await app.repos.hypotheses.create(
        hypothesis_id="H1",
        project_id=project_id,
        created_in_session_id=session_id,
        title="Candidate change",
        summary="Try a simple candidate.",
        status=RecordStatus.ACCEPTED,
    )
    task = await app.repos.tasks.create(
        task_id=await app.repos.tasks.next_id(project_id=project_id),
        project_id=project_id,
        created_in_session_id=session_id,
        title="Run candidate experiment",
        content="Run one candidate experiment.",
        kind=TaskKind.EXPERIMENT,
        priority="high",
        source_kind="manager",
        payload={
            "hypothesis_ids": [hypothesis.id],
            "compute": {"pool": "local"},
        },
    )
    return task.id


async def _run_scientist_workflow_with_runtime_error(
    *,
    app: HarnessApp,
    session_id: str,
    project_id: str,
    task_id: str,
    error: RuntimeError,
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    class FakeRuntime:
        model_name = "test-model"

        async def run_session(self, **_kwargs: Any) -> Any:
            raise error

    async def fake_get_agent_runtime(_project_dir: Path) -> FakeRuntime:
        return FakeRuntime()

    monkeypatch.setattr(
        "situ.harness.agent_runtime.get_agent_runtime",
        fake_get_agent_runtime,
    )

    with pytest.raises(RuntimeError):
        await task_workflows.run_scientist_workflow.__wrapped__.__wrapped__(
            task_id=task_id,
            session_id=session_id,
            project_id=project_id,
            workspace_root=str(app.context.repo_root),
            home=str(app.context.home),
            app_root=str(app.app_root),
        )


async def _create_patch_artifact(
    *,
    app: HarnessApp,
    project_id: str,
    session_id: str,
    experiment_id: str,
    artifact_id: str,
) -> None:
    patch_dir = app.context.project_dir / "artifacts" / "patches" / project_id
    patch_dir.mkdir(parents=True, exist_ok=True)
    patch_path = patch_dir / f"{artifact_id}-{experiment_id}.patch"
    patch_path.write_text(
        f"diff --git a/{experiment_id} b/{experiment_id}\n",
        encoding="utf-8",
    )
    await app.repos.artifacts.create(
        artifact_id=artifact_id,
        project_id=project_id,
        created_in_session_id=session_id,
        associated_entity_kind="experiment",
        associated_entity_id=experiment_id,
        kind="patch",
        title=f"Patch handoff from {experiment_id}",
        path=str(patch_path.relative_to(app.context.project_dir)),
        media_type="text/x-patch",
        size_bytes=patch_path.stat().st_size,
    )


async def _app_with_initial_plan(tmp_path: Path) -> tuple[HarnessApp, str, str]:
    workspace = tmp_path / "workspace"
    workspace.mkdir()
    _git(workspace, "init")
    (workspace / "README.md").write_text("test workspace\n")
    _git(workspace, "add", ".")
    _commit(workspace, "initial")
    app = await HarnessApp.create(
        workspace,
        app_root=Path.cwd(),
        project_home=tmp_path / "home",
        notify=_noop_notify,
    )
    workspace_record = await app.repos.workspaces.ensure()
    project = await app.repos.projects.create(
        project_id="P1",
        workspace_id=workspace_record.id,
        title="Improve score",
        objective="Improve score.",
        research_context="Run local evals.",
    )
    session = await app.repos.sessions.create(
        session_id="S1",
        workspace_id=workspace_record.id,
        project_id=project.id,
    )
    await app._ensure_project_agents(session_id=session.id, project_id=project.id)
    await create_plan_task(
        app.repos,
        session_id=session.id,
        project_id=project.id,
        title="Plan first pass",
        content="File first Scientist work.",
    )
    return app, session.id, project.id


def _git(cwd: Path, *args: str) -> str:
    result = subprocess.run(
        ["git", *args],
        cwd=cwd,
        check=True,
        capture_output=True,
        text=True,
    )
    return result.stdout.strip()


def _commit(cwd: Path, message: str) -> None:
    _git(
        cwd,
        "-c",
        "user.email=situ@example.test",
        "-c",
        "user.name=Situ Test",
        "commit",
        "-m",
        message,
    )
