from __future__ import annotations

from pathlib import Path
from typing import Any

import pytest

from almanac.harness.core.db import Database
from almanac.harness.repositories import Repositories
from almanac.harness.tools.activities import (
    ListExperimentActivitiesTool,
    ListHypothesisActivitiesTool,
)
from almanac.harness.tools.artifacts import CreateArtifactTool, ListArtifactsTool
from almanac.harness.tools.comments import (
    AddExperimentCommentTool,
    AddHypothesisCommentTool,
)
from almanac.harness.tools.common import AlmanacToolDeps, invoke_almanac_tool_sync
from almanac.harness.tools.experiments import (
    CreateExperimentTool,
    ListExperimentsTool,
    UpdateExperimentTool,
)
from almanac.harness.tools.hypotheses import (
    CreateHypothesisTool,
    ListHypothesesTool,
    UpdateHypothesisTool,
)
from almanac.harness.tools.links import LinkHypothesisExperimentTool
from almanac.harness.tools.objectives import GetObjectiveTool
from almanac.harness.tools.sessions import GetSessionTool


@pytest.fixture
def repos(tmp_path: Path) -> Repositories:
    db = Database(
        tmp_path / "almanac.sqlite",
        project_id="project_test",
        repo_path="/tmp/project",
    )
    repositories = Repositories.create(db)
    repositories.project_config.set(
        research_context=(
            "Use the available eval scripts and compare score/latency. "
            "Expected signals: score, latency_ms. Baseline, variants, and combinations."
        ),
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
        associated_session_id="session_0001",
    )
    repositories.experiments.create(
        experiment_id="exp_session_0001_a",
        objective_id="objective_0001",
        title="Try component A",
        summary="Apply component A.",
        associated_session_id="session_0001",
    )
    return repositories


def test_get_session_tool_reads_current_session_graph(repos: Repositories) -> None:
    deps = AlmanacToolDeps(session_id="session_0001", repos=repos)

    result = invoke_almanac_tool_sync(tool=GetSessionTool(), deps=deps)

    assert result.success is True
    assert result.config is not None
    assert result.objective is not None
    assert result.objective["title"] == "Improve score"
    assert result.session is not None
    assert result.session["id"] == "session_0001"
    assert [hypothesis["id"] for hypothesis in result.hypotheses] == ["hyp_0001"]
    assert [experiment["id"] for experiment in result.experiments] == [
        "exp_session_0001_a"
    ]


def test_get_objective_tool_defaults_to_current_session_objective(
    repos: Repositories,
) -> None:
    deps = AlmanacToolDeps(session_id="session_0001", repos=repos)

    result = invoke_almanac_tool_sync(tool=GetObjectiveTool(), deps=deps)

    assert result.success is True
    assert result.objective is not None
    assert result.objective["id"] == "objective_0001"


def test_hypothesis_tools_create_update_and_list(repos: Repositories) -> None:
    emitted: list[dict[str, Any]] = []
    deps = AlmanacToolDeps(
        session_id="session_0001",
        repos=repos,
        emit_event=_event_collector(emitted),
    )

    created = invoke_almanac_tool_sync(
        tool=CreateHypothesisTool(),
        deps=deps,
        title="Component C helps",
        summary="Component C may combine with A.",
    )
    assert created.success is True
    assert created.hypothesis is not None
    assert created.hypothesis["id"] == "hyp_objective_0001_agent_002"
    assert created.hypothesis["status"] == "open"

    updated = invoke_almanac_tool_sync(
        tool=UpdateHypothesisTool(),
        deps=deps,
        hypothesis_id="hyp_objective_0001_agent_002",
        status="active",
        summary="Component C is ready to test.",
    )
    assert updated.success is True
    assert updated.hypothesis is not None
    assert updated.hypothesis["status"] == "active"

    listed = invoke_almanac_tool_sync(
        tool=ListHypothesesTool(),
        deps=deps,
        status="active",
    )
    assert listed.success is True
    assert [hypothesis["id"] for hypothesis in listed.hypotheses] == [
        "hyp_0001",
        "hyp_objective_0001_agent_002",
    ]
    assert [event["type"] for event in emitted] == [
        "hypothesis.created",
        "hypothesis.updated",
    ]


def test_experiment_tools_create_update_and_list(repos: Repositories) -> None:
    emitted: list[dict[str, Any]] = []
    deps = AlmanacToolDeps(
        session_id="session_0001",
        repos=repos,
        emit_event=_event_collector(emitted),
    )

    created = invoke_almanac_tool_sync(
        tool=CreateExperimentTool(),
        deps=deps,
        title="Try component C",
        summary="Apply component C independently.",
    )
    assert created.success is True
    assert created.experiment is not None
    assert created.experiment["id"] == "exp_session_0001_agent_002"
    assert created.experiment["status"] == "open"

    updated = invoke_almanac_tool_sync(
        tool=UpdateExperimentTool(),
        deps=deps,
        experiment_id="exp_session_0001_agent_002",
        status="closed",
        summary="Component C improved score but hurt latency.",
    )
    assert updated.success is True
    assert updated.experiment is not None
    assert updated.experiment["status"] == "closed"

    listed = invoke_almanac_tool_sync(tool=ListExperimentsTool(), deps=deps)
    assert listed.success is True
    assert [experiment["id"] for experiment in listed.experiments] == [
        "exp_session_0001_a",
        "exp_session_0001_agent_002",
    ]
    assert [event["type"] for event in emitted] == [
        "experiment.created",
        "experiment.updated",
    ]


def test_link_tool_links_hypothesis_and_experiment(repos: Repositories) -> None:
    deps = AlmanacToolDeps(session_id="session_0001", repos=repos)

    result = invoke_almanac_tool_sync(
        tool=LinkHypothesisExperimentTool(),
        deps=deps,
        hypothesis_id="hyp_0001",
        experiment_id="exp_session_0001_a",
    )

    assert result.success is True
    assert result.link is not None
    assert result.link["hypothesis_id"] == "hyp_0001"
    assert result.link["experiment_id"] == "exp_session_0001_a"


def test_comment_tools_write_activity_records(repos: Repositories) -> None:
    emitted: list[dict[str, Any]] = []
    deps = AlmanacToolDeps(
        session_id="session_0001",
        repos=repos,
        emit_event=_event_collector(emitted),
    )

    hypothesis_comment = invoke_almanac_tool_sync(
        tool=AddHypothesisCommentTool(),
        deps=deps,
        hypothesis_id="hyp_0001",
        comment="Component A is promising enough to test.",
        payload={"reason": "first pass"},
    )
    experiment_comment = invoke_almanac_tool_sync(
        tool=AddExperimentCommentTool(),
        deps=deps,
        experiment_id="exp_session_0001_a",
        comment="Component A improved score.",
        payload={"signals": [{"key": "score", "value": 0.73}]},
    )

    assert hypothesis_comment.success is True
    assert hypothesis_comment.activity is not None
    assert hypothesis_comment.activity["kind"] == "comment"
    assert hypothesis_comment.activity["body"] == "Component A is promising enough to test."
    assert experiment_comment.success is True
    assert experiment_comment.activity is not None
    assert experiment_comment.activity["kind"] == "comment"
    assert experiment_comment.activity["body"] == "Component A improved score."

    hypothesis_activities = invoke_almanac_tool_sync(
        tool=ListHypothesisActivitiesTool(),
        deps=deps,
        hypothesis_id="hyp_0001",
    )
    experiment_activities = invoke_almanac_tool_sync(
        tool=ListExperimentActivitiesTool(),
        deps=deps,
        experiment_id="exp_session_0001_a",
    )

    assert [activity["id"] for activity in hypothesis_activities.activities] == [1]
    assert [activity["id"] for activity in experiment_activities.activities] == [1]
    assert [event["type"] for event in emitted] == [
        "hypothesis.comment_added",
        "experiment.comment_added",
    ]


def test_artifact_tools_create_and_list_artifacts(repos: Repositories) -> None:
    deps = AlmanacToolDeps(session_id="session_0001", repos=repos)

    created = invoke_almanac_tool_sync(
        tool=CreateArtifactTool(),
        deps=deps,
        kind="json",
        title="raw eval output",
        path="artifacts/raw.json",
        associated_entity_kind="experiment",
        associated_entity_id="exp_session_0001_a",
        media_type="application/json",
        size_bytes=120,
    )
    assert created.success is True
    assert created.artifact is not None
    assert created.artifact["id"] == "artifact_session_0001_001"
    assert created.artifact["associated_entity_kind"] == "experiment"
    assert created.artifact["associated_entity_id"] == "exp_session_0001_a"

    listed = invoke_almanac_tool_sync(
        tool=ListArtifactsTool(),
        deps=deps,
        associated_entity_kind="experiment",
        associated_entity_id="exp_session_0001_a",
    )
    assert listed.success is True
    assert [artifact["id"] for artifact in listed.artifacts] == [
        "artifact_session_0001_001"
    ]


def _event_collector(
    emitted: list[dict[str, Any]],
) -> Any:
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

    return emit_event
