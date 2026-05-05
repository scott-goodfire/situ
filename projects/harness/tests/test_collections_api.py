from __future__ import annotations

from pathlib import Path
from typing import Any

import pytest
from almanac.protocol import (
    CollectionUpsertedParams,
    CollectionsBootstrapResult,
    CollectionsSubscribeResult,
)
from almanac.harness.app import HarnessApp


class FakeAgentRuntime:
    def __init__(self, _project_dir: Path) -> None:
        pass

    def plan_session(self, **_kwargs: Any):
        class Plan:
            summary = "fake plan"

            def model_dump(self) -> dict[str, Any]:
                return {"summary": self.summary}

        return Plan()


@pytest.fixture
def app(tmp_path: Path, monkeypatch: pytest.MonkeyPatch) -> HarnessApp:
    monkeypatch.setattr("almanac.harness.app.AgentRuntime", FakeAgentRuntime)
    workspace = tmp_path / "workspace"
    workspace.mkdir()
    return HarnessApp(
        workspace,
        app_root=Path.cwd(),
        project_home=tmp_path / "home",
        notify=lambda _method, _params: None,
    )


def test_collections_bootstrap_returns_research_objects_and_events(
    app: HarnessApp,
) -> None:
    app.setup_complete(
        {
            "objective": "Improve score",
            "research_context": "Run local evals. Expected signals: score. Baseline and variants.",
        }
    )
    app.repos.sessions.create("session_0001", objective_id="objective_0001")
    app.repos.hypotheses.create(
        hypothesis_id="hyp_0001",
        objective_id="objective_0001",
        title="Component A helps",
        summary="Component A may improve score.",
        status="active",
    )
    app.repos.experiments.create(
        experiment_id="exp_session_0001_baseline",
        objective_id="objective_0001",
        title="Record baseline",
        summary="Baseline eval.",
        associated_session_id="session_0001",
    )
    activity = app.repos.experiment_activities.add(
        experiment_id="exp_session_0001_baseline",
        session_id="session_0001",
        actor="worker",
        kind="comment",
        body="Baseline result recorded.",
        payload={"activity_type": "result"},
    )
    event = app.record_event(
        "experiment.completed",
        "Completed exp_session_0001_baseline",
        session_id="session_0001",
        payload={"experiment_id": "exp_session_0001_baseline"},
    )

    bootstrap = CollectionsBootstrapResult.model_validate(app.collections_bootstrap({}))

    assert bootstrap.cursor == event.id
    assert [objective.id for objective in bootstrap.objectives] == ["objective_0001"]
    assert [session.id for session in bootstrap.sessions] == ["session_0001"]
    assert [hypothesis.id for hypothesis in bootstrap.hypotheses] == ["hyp_0001"]
    assert [experiment.id for experiment in bootstrap.experiments] == [
        "exp_session_0001_baseline"
    ]
    assert [item.id for item in bootstrap.experiment_activities] == [activity.id]
    assert [item.type for item in bootstrap.events] == [
        "setup.completed",
        "experiment.completed",
    ]


def test_collections_subscribe_emits_event_upserts(
    tmp_path: Path,
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    monkeypatch.setattr("almanac.harness.app.AgentRuntime", FakeAgentRuntime)
    workspace = tmp_path / "workspace"
    workspace.mkdir()
    notifications: list[tuple[str, dict[str, Any]]] = []
    app = HarnessApp(
        workspace,
        app_root=Path.cwd(),
        project_home=tmp_path / "home",
        notify=lambda method, params: notifications.append((method, params)),
    )

    subscribe = CollectionsSubscribeResult.model_validate(app.collections_subscribe({}))
    event = app.record_event("system.ready", "Harness ready")

    assert subscribe.subscribed is True
    assert subscribe.cursor == 0
    assert notifications[-1][0] == "collections.upserted"
    upsert = CollectionUpsertedParams.model_validate(notifications[-1][1])
    assert upsert.cursor == event.id
    assert upsert.collection == "events"
    assert upsert.key == str(event.id)
    assert upsert.record["type"] == "system.ready"
