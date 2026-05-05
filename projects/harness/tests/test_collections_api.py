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


def test_collections_bootstrap_returns_runs_experiments_and_events(app: HarnessApp) -> None:
    app.setup_complete(
        {
            "goal": "Improve score",
            "evaluation_context": "Run local evals.",
            "known_signals": ["score"],
            "experiment_scope": "Baseline and variants.",
        }
    )
    app.repos.runs.create("run_0001")
    app.repos.experiments.create(
        experiment_id="exp_run_0001_baseline",
        run_id="run_0001",
        intent="Record baseline.",
        change_summary="Baseline eval.",
        components=["baseline"],
        based_on=[],
    )
    event = app.record_event(
        "experiment.queued",
        "Queued exp_run_0001_baseline",
        run_id="run_0001",
        payload={"experiment_id": "exp_run_0001_baseline"},
    )

    bootstrap = CollectionsBootstrapResult.model_validate(app.collections_bootstrap({}))

    assert bootstrap.cursor == event.id
    assert [run.id for run in bootstrap.runs] == ["run_0001"]
    assert [experiment.id for experiment in bootstrap.experiments] == [
        "exp_run_0001_baseline"
    ]
    assert [item.type for item in bootstrap.events] == [
        "setup.completed",
        "experiment.queued",
    ]


def test_collections_subscribe_emits_event_upserts(tmp_path: Path, monkeypatch: pytest.MonkeyPatch) -> None:
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
