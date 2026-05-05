from __future__ import annotations

from pathlib import Path
from typing import Any

import pytest

from almanac.harness.core.db import Database
from almanac.harness.repositories import Repositories
from almanac.harness.tools.activities import (
    RecordExperimentActivityTool,
    RecordHypothesisActivityTool,
)
from almanac.harness.tools.agent_context import GetAgentContextTool
from almanac.harness.tools.common import AlmanacToolDeps, invoke_almanac_tool_sync


@pytest.fixture
def repos(tmp_path: Path) -> Repositories:
    db = Database(
        tmp_path / "almanac.sqlite",
        project_id="project_test",
        repo_path="/tmp/project",
    )
    repositories = Repositories.create(db)
    repositories.project_config.set(
        evaluation_context="Run a JSON eval.",
        known_signals=["score"],
        experiment_scope="Baseline and variants.",
    )
    repositories.objectives.create(
        objective_id="objective_0001",
        title="Improve score",
        description="Improve score without hurting latency.",
    )
    repositories.sessions.create("session_0001", objective_id="objective_0001")
    repositories.hypotheses.create(
        hypothesis_id="hyp_0001",
        objective_id="objective_0001",
        title="Component A helps",
        summary="Component A may improve score.",
        status="active",
    )
    repositories.experiments.create(
        experiment_id="exp_session_0001_a",
        objective_id="objective_0001",
        title="Try component A",
        summary="Apply component A.",
        created_in_session_id="session_0001",
    )
    return repositories


def test_get_agent_context_tool_reads_current_session(repos: Repositories) -> None:
    deps = AlmanacToolDeps(session_id="session_0001", repos=repos)

    result = invoke_almanac_tool_sync(tool=GetAgentContextTool(), deps=deps)

    assert result.success is True
    assert result.config is not None
    assert result.objective is not None
    assert result.objective["title"] == "Improve score"
    assert result.session is not None
    assert result.session["id"] == "session_0001"
    assert [hypothesis["id"] for hypothesis in result.active_hypotheses] == ["hyp_0001"]


def test_record_hypothesis_activity_tool_writes_activity_and_event(
    repos: Repositories,
) -> None:
    emitted: list[dict[str, Any]] = []

    def emit_event(
        event_type: str,
        message: str,
        session_id: str | None,
        payload: dict[str, Any] | None,
    ) -> dict[str, Any]:
        event = {
            "type": event_type,
            "message": message,
            "session_id": session_id,
            "payload": payload or {},
        }
        emitted.append(event)
        return event

    deps = AlmanacToolDeps(session_id="session_0001", repos=repos, emit_event=emit_event)

    result = invoke_almanac_tool_sync(
        tool=RecordHypothesisActivityTool(),
        deps=deps,
        hypothesis_id="hyp_0001",
        kind="update",
        body="Component A is promising enough to test.",
        payload={"reason": "first pass"},
    )

    assert result.success is True
    assert result.activity is not None
    assert result.activity["body"] == "Component A is promising enough to test."
    assert repos.hypothesis_activities.list_for_session("session_0001")[0].model_dump() == (
        result.activity
    )
    assert emitted == [
        {
            "type": "hypothesis.activity_recorded",
            "message": "Component A is promising enough to test.",
            "session_id": "session_0001",
            "payload": {
                "activity_id": result.activity["id"],
                "hypothesis_id": "hyp_0001",
                "kind": "update",
            },
        }
    ]


def test_record_experiment_activity_tool_writes_activity_and_event(
    repos: Repositories,
) -> None:
    emitted: list[dict[str, Any]] = []

    def emit_event(
        event_type: str,
        message: str,
        session_id: str | None,
        payload: dict[str, Any] | None,
    ) -> dict[str, Any]:
        event = {
            "type": event_type,
            "message": message,
            "session_id": session_id,
            "payload": payload or {},
        }
        emitted.append(event)
        return event

    deps = AlmanacToolDeps(session_id="session_0001", repos=repos, emit_event=emit_event)

    result = invoke_almanac_tool_sync(
        tool=RecordExperimentActivityTool(),
        deps=deps,
        experiment_id="exp_session_0001_a",
        kind="result",
        body="Component A improved score.",
        payload={"signals": [{"key": "score", "value": 0.73}]},
    )

    assert result.success is True
    assert result.activity is not None
    assert result.activity["kind"] == "result"
    assert repos.experiment_activities.list_for_session("session_0001")[0].model_dump() == (
        result.activity
    )
    assert emitted == [
        {
            "type": "experiment.activity_recorded",
            "message": "Component A improved score.",
            "session_id": "session_0001",
            "payload": {
                "activity_id": result.activity["id"],
                "experiment_id": "exp_session_0001_a",
                "kind": "result",
            },
        }
    ]
