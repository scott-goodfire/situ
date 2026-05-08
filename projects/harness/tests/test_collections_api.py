from __future__ import annotations

from pathlib import Path
from typing import Any

import pytest
import pytest_asyncio
from situ.protocol import (
    CollectionUpsertedParams,
    CollectionsBootstrapResult,
    CollectionsChangesSinceParams,
    CollectionsChangesSinceResult,
    CollectionsSubscribeResult,
)
from situ.harness.app import HarnessApp
from situ.harness.core.task_execution import create_plan_task


async def _noop_notify(_method: str, _params: dict[str, Any]) -> None:
    return None


class FakeAgentRuntime:
    def __init__(self, _project_dir: Path) -> None:
        pass

    @classmethod
    async def create(cls, project_dir: Path) -> "FakeAgentRuntime":
        return cls(project_dir)

    async def plan_session(self, **_kwargs: Any):
        class Plan:
            summary = "fake plan"

            def model_dump(self) -> dict[str, Any]:
                return {"summary": self.summary}

        return Plan()


@pytest_asyncio.fixture
async def app(tmp_path: Path, monkeypatch: pytest.MonkeyPatch) -> HarnessApp:
    monkeypatch.setattr("situ.harness.app.AgentRuntime", FakeAgentRuntime)
    workspace = tmp_path / "workspace"
    workspace.mkdir()
    return await HarnessApp.create(
        workspace,
        app_root=Path.cwd(),
        project_home=tmp_path / "home",
        notify=_noop_notify,
    )


@pytest.mark.asyncio
async def test_collections_bootstrap_returns_research_objects_and_events(
    app: HarnessApp,
) -> None:
    await app.handle_async("setup.complete", {})
    workspace = await app.repos.workspaces.ensure()
    project = await app.repos.projects.create(
        project_id="P1",
        workspace_id=workspace.id,
        title="Improve score",
        objective="Improve score.",
        research_context="Run local evals. Expected signals: score. Baseline and variants.",
    )
    session = await app.repos.sessions.create(
        session_id="S1",
        workspace_id=workspace.id,
        project_id=project.id,
    )
    await app.repos.hypotheses.create(
        hypothesis_id="H1",
        project_id=project.id,
        created_in_session_id=session.id,
        title="Component A helps",
        summary="Component A may improve score.",
        status="active",
    )
    await app.repos.experiments.create(
        experiment_id="EX1",
        project_id=project.id,
        created_in_session_id=session.id,
        title="Try component A",
        summary="Candidate eval.",
    )
    baseline = await app.repos.baselines.create(
        baseline_id="B1",
        project_id=project.id,
        created_in_session_id=session.id,
        title="Current workspace baseline",
        summary="Reference behavior before candidate changes.",
    )
    evaluation = await app.repos.evaluations.create(
        evaluation_id="EV1",
        project_id=project.id,
        created_in_session_id=session.id,
        title="Baseline project eval",
        summary="Run the baseline project evaluation.",
        associated_baseline_id=baseline.id,
    )
    analysis = await app.repos.analyses.create(
        analysis_id="A1",
        project_id=project.id,
        created_in_session_id=session.id,
        title="Codebase map",
        summary="Mapped the backend primitives.",
        content="Records and repositories define the backend data model.",
        status="active",
    )
    activity = await app.repos.experiment_activities.add(
        experiment_id="EX1",
        created_in_session_id=session.id,
        actor="worker",
        kind="comment",
        body="Baseline result recorded.",
        payload={"activity_type": "result"},
    )
    analysis_activity = await app.repos.analysis_activities.add(
        analysis_id=analysis.id,
        created_in_session_id=session.id,
        actor="agent",
        kind="comment",
        body="Codebase map ready.",
    )
    evaluation_activity = await app.repos.evaluation_activities.add(
        evaluation_id=evaluation.id,
        created_in_session_id=session.id,
        actor="agent",
        kind="recorded",
        body="Baseline result recorded.",
        payload={"record_type": "trust_finding"},
    )
    measurement = await app.repos.measurements.add(
        evaluation_id=evaluation.id,
        created_in_session_id=session.id,
        actor="agent",
        body="Baseline result recorded.",
        payload={"activity_type": "result", "metrics": {"score": 0.71}},
    )
    event = await app.record_event(
        event_type="experiment.completed",
        message="Completed baseline measurement",
        session_id="S1",
        payload={"measurement_id": measurement.id},
    )

    bootstrap = CollectionsBootstrapResult.model_validate(
        await app.handle_async("collections.bootstrap", {})
    )

    assert bootstrap.cursor == await app.repos.collection_changes.current_cursor(
        scope_id=workspace.id
    )
    assert [item.id for item in bootstrap.workspaces] == [workspace.id]
    assert [project.id for project in bootstrap.projects] == [project.id]
    assert [session.id for session in bootstrap.sessions] == ["S1"]
    assert [hypothesis.id for hypothesis in bootstrap.hypotheses] == ["H1"]
    assert [item.id for item in bootstrap.baselines] == [
        "B1"
    ]
    assert [experiment.id for experiment in bootstrap.experiments] == [
        "EX1"
    ]
    assert [item.id for item in bootstrap.evaluations] == [
        "EV1"
    ]
    assert [item.id for item in bootstrap.measurements] == [measurement.id]
    assert [item.id for item in bootstrap.analyses] == ["A1"]
    assert [item.id for item in bootstrap.experiment_activities] == [activity.id]
    assert [item.id for item in bootstrap.analysis_activities] == [
        analysis_activity.id
    ]
    assert [item.id for item in bootstrap.evaluation_activities] == [
        evaluation_activity.id
    ]
    assert [item.type for item in bootstrap.events] == [
        "setup.completed",
        "experiment.completed",
    ]


@pytest.mark.asyncio
async def test_collections_subscribe_emits_event_upserts(
    tmp_path: Path,
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    monkeypatch.setattr("situ.harness.app.AgentRuntime", FakeAgentRuntime)
    workspace = tmp_path / "workspace"
    workspace.mkdir()
    notifications: list[tuple[str, dict[str, Any]]] = []

    async def notify(method: str, params: dict[str, Any]) -> None:
        notifications.append((method, params))

    app = await HarnessApp.create(
        workspace,
        app_root=Path.cwd(),
        project_home=tmp_path / "home",
        notify=notify,
    )

    subscribe = CollectionsSubscribeResult.model_validate(
        await app.handle_async("collections.subscribe", {})
    )
    event = await app.record_event(
        event_type="system.ready",
        message="Harness ready",
    )

    assert subscribe.subscribed is True
    assert subscribe.cursor == 0
    assert notifications[-1][0] == "collections.upserted"
    upsert = CollectionUpsertedParams.model_validate(notifications[-1][1])
    assert upsert.cursor == event.id
    assert upsert.source_event_id == event.id
    assert upsert.collection == "events"
    assert upsert.key == str(event.id)
    assert upsert.record["type"] == "system.ready"


@pytest.mark.asyncio
async def test_collections_changes_since_replays_missed_upserts(
    app: HarnessApp,
) -> None:
    await app.handle_async("setup.complete", {})
    workspace = await app.repos.workspaces.ensure()
    project = await app.repos.projects.create(
        project_id="P1",
        workspace_id=workspace.id,
        title="Improve score",
        objective="Improve score.",
        research_context="Run local evals.",
    )
    session = await app.repos.sessions.create(
        session_id="S1",
        workspace_id=workspace.id,
        project_id=project.id,
    )
    cursor = await app.repos.collection_changes.current_cursor(scope_id=workspace.id)

    event = await app.record_event(
        event_type="task.created",
        message="Created task T1",
        session_id=session.id,
        payload={"task_id": "T1"},
    )
    task = await app.repos.tasks.create(
        task_id="T1",
        project_id=project.id,
        created_in_session_id=session.id,
        title="Plan next step",
        content="Plan the next research step.",
        kind="plan",
    )
    await app.publish_record(record=task, cursor=event.id)

    replay = CollectionsChangesSinceResult.model_validate(
        await app.handle_async(
            "collections.changes_since",
            CollectionsChangesSinceParams(cursor=cursor).model_dump(),
        )
    )

    assert replay.reset_required is False
    assert replay.has_more is False
    assert [change.collection for change in replay.changes] == ["events", "tasks"]
    assert [change.cursor for change in replay.changes] == list(
        range(cursor + 1, cursor + 3)
    )
    assert replay.changes[-1].record is not None
    assert replay.changes[-1].record["id"] == task.id


@pytest.mark.asyncio
async def test_direct_repository_writes_append_collection_changes_without_publish_record(
    app: HarnessApp,
) -> None:
    workspace = await app.repos.workspaces.ensure()
    project = await app.repos.projects.create(
        project_id="P1",
        workspace_id=workspace.id,
        title="Improve score",
        objective="Improve score.",
        research_context="Run local evals.",
    )
    session = await app.repos.sessions.create(
        session_id="S1",
        workspace_id=workspace.id,
        project_id=project.id,
    )
    task = await app.repos.tasks.create(
        task_id="T1",
        project_id=project.id,
        created_in_session_id=session.id,
        title="Plan next step",
        content="Plan the next research step.",
        kind="plan",
    )

    changes = await app.repos.collection_changes.list_since(
        scope_id=workspace.id,
        cursor=0,
        limit=20,
    )

    assert [(change.collection, change.key) for change in changes] == [
        ("workspaces", workspace.id),
        ("projects", project.id),
        ("sessions", session.id),
        ("tasks", task.id),
    ]
    assert [change.cursor for change in changes] == [1, 2, 3, 4]
    assert [change.op for change in changes] == ["upsert"] * 4
    assert changes[-1].record is not None
    assert changes[-1].record["id"] == task.id


@pytest.mark.asyncio
async def test_product_write_rollback_removes_collection_change(
    app: HarnessApp,
) -> None:
    workspace = await app.repos.workspaces.ensure()

    async with app.repos.db.connect() as db:
        await db.execute("BEGIN")
        await db.execute(
            """
            INSERT INTO projects
              (id, workspace_id, title, objective, research_context, status,
               created_at, updated_at)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?)
            """,
            (
                "P1",
                workspace.id,
                "Rolled back",
                "Rolled back.",
                "This write should not escape rollback.",
                "active",
                "2026-05-08T00:00:00Z",
                "2026-05-08T00:00:00Z",
            ),
        )
        await db.rollback()

    assert await app.repos.projects.get(project_id="P1") is None
    changes = await app.repos.collection_changes.list_since(
        scope_id=workspace.id,
        cursor=0,
        limit=20,
    )
    assert [(change.collection, change.key) for change in changes] == [
        ("workspaces", workspace.id),
    ]


@pytest.mark.asyncio
async def test_direct_repository_update_appends_collection_change(
    app: HarnessApp,
) -> None:
    workspace = await app.repos.workspaces.ensure()
    project = await app.repos.projects.create(
        project_id="P1",
        workspace_id=workspace.id,
        title="Improve score",
        objective="Improve score.",
        research_context="Run local evals.",
    )
    cursor = await app.repos.collection_changes.current_cursor(scope_id=workspace.id)

    updated = await app.repos.projects.update(
        project_id=project.id,
        title="Improve score quickly",
    )

    changes = await app.repos.collection_changes.list_since(
        scope_id=workspace.id,
        cursor=cursor,
        limit=20,
    )
    assert updated is not None
    assert [(change.collection, change.key, change.op) for change in changes] == [
        ("projects", project.id, "upsert"),
    ]
    assert changes[0].record is not None
    assert changes[0].record["title"] == "Improve score quickly"


@pytest.mark.asyncio
async def test_direct_event_write_captures_source_event_row(
    app: HarnessApp,
) -> None:
    workspace = await app.repos.workspaces.ensure()
    project = await app.repos.projects.create(
        project_id="P1",
        workspace_id=workspace.id,
        title="Improve score",
        objective="Improve score.",
        research_context="Run local evals.",
    )
    session = await app.repos.sessions.create(
        session_id="S1",
        workspace_id=workspace.id,
        project_id=project.id,
    )

    event = await app.repos.events.add(
        event_type="task.created",
        message="Created task T1",
        associated_project_id=project.id,
        associated_session_id=session.id,
        payload={"task_id": "T1"},
    )

    changes = await app.repos.collection_changes.list_since(
        scope_id=workspace.id,
        cursor=0,
        limit=20,
    )
    event_changes = [change for change in changes if change.collection == "events"]

    assert len(event_changes) == 1
    assert event_changes[0].key == str(event.id)
    assert event_changes[0].source_event_id == event.id
    assert event_changes[0].record is not None
    assert event_changes[0].record["id"] == event.id
    assert event_changes[0].record["type"] == "task.created"


@pytest.mark.asyncio
async def test_direct_repository_outbox_changes_are_ordered_per_workspace(
    tmp_path: Path,
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    monkeypatch.setattr("situ.harness.app.AgentRuntime", FakeAgentRuntime)
    workspace_a_path = tmp_path / "workspace-a"
    workspace_b_path = tmp_path / "workspace-b"
    workspace_a_path.mkdir()
    workspace_b_path.mkdir()
    home = tmp_path / "home"
    app_a = await HarnessApp.create(
        workspace_a_path,
        app_root=Path.cwd(),
        project_home=home,
        notify=_noop_notify,
    )
    app_b = await HarnessApp.create(
        workspace_b_path,
        app_root=Path.cwd(),
        project_home=home,
        notify=_noop_notify,
    )

    workspace_a = await app_a.repos.workspaces.ensure()
    project_a = await app_a.repos.projects.create(
        project_id="P1",
        workspace_id=workspace_a.id,
        title="Improve score",
        objective="Improve score.",
        research_context="Run local evals.",
    )
    session_a = await app_a.repos.sessions.create(
        session_id="S1",
        workspace_id=workspace_a.id,
        project_id=project_a.id,
    )

    workspace_b = await app_b.repos.workspaces.ensure()
    project_b = await app_b.repos.projects.create(
        project_id="P2",
        workspace_id=workspace_b.id,
        title="Reduce latency",
        objective="Reduce latency.",
        research_context="Run local benchmarks.",
    )
    await app_b.repos.sessions.create(
        session_id="S2",
        workspace_id=workspace_b.id,
        project_id=project_b.id,
    )

    await app_a.repos.tasks.create(
        task_id="T1",
        project_id=project_a.id,
        created_in_session_id=session_a.id,
        title="Plan next step",
        content="Plan the next research step.",
        kind="plan",
    )

    changes_a = await app_a.repos.collection_changes.list_since(
        scope_id=workspace_a.id,
        cursor=0,
        limit=20,
    )
    changes_b = await app_b.repos.collection_changes.list_since(
        scope_id=workspace_b.id,
        cursor=0,
        limit=20,
    )

    assert [change.cursor for change in changes_a] == [1, 2, 3, 4]
    assert [change.collection for change in changes_a] == [
        "workspaces",
        "projects",
        "sessions",
        "tasks",
    ]
    assert [change.cursor for change in changes_b] == [1, 2, 3]
    assert [change.collection for change in changes_b] == [
        "workspaces",
        "projects",
        "sessions",
    ]


@pytest.mark.asyncio
async def test_global_compute_target_writes_reach_known_workspaces(
    tmp_path: Path,
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    monkeypatch.setattr("situ.harness.app.AgentRuntime", FakeAgentRuntime)
    workspace_a_path = tmp_path / "workspace-a"
    workspace_b_path = tmp_path / "workspace-b"
    workspace_a_path.mkdir()
    workspace_b_path.mkdir()
    home = tmp_path / "home"
    app_a = await HarnessApp.create(
        workspace_a_path,
        app_root=Path.cwd(),
        project_home=home,
        notify=_noop_notify,
    )
    app_b = await HarnessApp.create(
        workspace_b_path,
        app_root=Path.cwd(),
        project_home=home,
        notify=_noop_notify,
    )
    workspace_a = await app_a.repos.workspaces.ensure()
    workspace_b = await app_b.repos.workspaces.ensure()
    cursor_a = await app_a.repos.collection_changes.current_cursor(scope_id=workspace_a.id)
    cursor_b = await app_b.repos.collection_changes.current_cursor(scope_id=workspace_b.id)

    target = await app_a.repos.compute_targets.register(pool="remote", label="Remote")

    changes_a = await app_a.repos.collection_changes.list_since(
        scope_id=workspace_a.id,
        cursor=cursor_a,
        limit=20,
    )
    changes_b = await app_b.repos.collection_changes.list_since(
        scope_id=workspace_b.id,
        cursor=cursor_b,
        limit=20,
    )
    assert [(change.collection, change.key) for change in changes_a] == [
        ("compute_targets", target.id),
    ]
    assert [(change.collection, change.key) for change in changes_b] == [
        ("compute_targets", target.id),
    ]


@pytest.mark.asyncio
async def test_collection_notifications_use_workspace_scope_for_project_records(
    tmp_path: Path,
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    monkeypatch.setattr("situ.harness.app.AgentRuntime", FakeAgentRuntime)
    workspace_path = tmp_path / "workspace"
    workspace_path.mkdir()
    notifications: list[tuple[str, dict[str, Any]]] = []

    async def notify(method: str, params: dict[str, Any]) -> None:
        notifications.append((method, params))

    app = await HarnessApp.create(
        workspace_path,
        app_root=Path.cwd(),
        project_home=tmp_path / "home",
        notify=notify,
    )
    workspace = await app.repos.workspaces.ensure()
    project = await app.repos.projects.create(
        project_id="P1",
        workspace_id=workspace.id,
        title="Improve score",
        objective="Improve score.",
        research_context="Run local evals.",
    )
    session = await app.repos.sessions.create(
        session_id="S1",
        workspace_id=workspace.id,
        project_id=project.id,
    )

    await app.handle_async("collections.subscribe", {})
    await create_plan_task(
        app.repos,
        session_id=session.id,
        project_id=project.id,
        title="Initial plan",
        content="Plan the next step.",
    )

    upserts = [
        CollectionUpsertedParams.model_validate(params)
        for method, params in notifications
        if method == "collections.upserted"
    ]
    assert [upsert.collection for upsert in upserts] == [
        "events",
        "tasks",
        "task_activities",
    ]
