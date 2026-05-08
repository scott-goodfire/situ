from __future__ import annotations

from pathlib import Path
from typing import Any

import pytest
from situ.protocol import (
    CollectionUpsertedParams,
    CollectionsBootstrapResult,
    CollectionsSubscribeResult,
)
from situ.harness.app import HarnessApp


class FakeAgentRuntime:
    def __init__(self, _project_dir: Path) -> None:
        pass

    async def plan_session(self, **_kwargs: Any):
        class Plan:
            summary = "fake plan"

            def model_dump(self) -> dict[str, Any]:
                return {"summary": self.summary}

        return Plan()


@pytest.fixture
def app(tmp_path: Path, monkeypatch: pytest.MonkeyPatch) -> HarnessApp:
    monkeypatch.setattr("situ.harness.app.AgentRuntime", FakeAgentRuntime)
    workspace = tmp_path / "workspace"
    workspace.mkdir()
    return HarnessApp(
        workspace,
        app_root=Path.cwd(),
        project_home=tmp_path / "home",
        notify=lambda _method, _params: None,
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
        kind="result",
        body="Baseline result recorded.",
        payload={"activity_type": "result"},
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

    assert bootstrap.cursor == event.id
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
    app = HarnessApp(
        workspace,
        app_root=Path.cwd(),
        project_home=tmp_path / "home",
        notify=lambda method, params: notifications.append((method, params)),
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
    assert upsert.collection == "events"
    assert upsert.key == str(event.id)
    assert upsert.record["type"] == "system.ready"
