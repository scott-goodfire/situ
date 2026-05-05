from __future__ import annotations

from pathlib import Path

import pytest
from almanac.harness.api.current_state import CurrentStateService
from almanac.harness.api.sessions import SessionsService
from almanac.harness.core.db import Database
from almanac.harness.records import (
    ExperimentRecord,
    HypothesisRecord,
    ObjectiveRecord,
    ProjectConfigRecord,
    SessionRecord,
)
from almanac.harness.repositories import Repositories


@pytest.fixture
def repos(tmp_path: Path) -> Repositories:
    db = Database(
        tmp_path / "almanac.sqlite",
        project_id="project_test",
        repo_path="/tmp/project",
    )
    return Repositories.create(db)


def create_project_config(repos: Repositories) -> ProjectConfigRecord:
    return repos.project_config.set(
        evaluation_context="Run a JSON eval.",
        known_signals=["score", "latency_ms"],
        experiment_scope="Baseline and variants.",
    )


def create_objective(repos: Repositories) -> ObjectiveRecord:
    create_project_config(repos)
    return repos.objectives.create(
        objective_id="objective_0001",
        title="Improve score",
        description="Improve score without hurting latency.",
    )


def create_session(
    repos: Repositories,
    session_id: str = "session_0001",
) -> SessionRecord:
    create_objective(repos)
    return repos.sessions.create(session_id, objective_id="objective_0001")


def create_hypothesis(repos: Repositories) -> HypothesisRecord:
    create_session(repos)
    return repos.hypotheses.create(
        hypothesis_id="hyp_0001",
        objective_id="objective_0001",
        title="Component A helps",
        summary="Component A may improve score.",
        status="active",
    )


def create_experiment(
    repos: Repositories,
    experiment_id: str = "exp_session_0001_a",
) -> ExperimentRecord:
    create_hypothesis(repos)
    return repos.experiments.create(
        experiment_id=experiment_id,
        objective_id="objective_0001",
        title="Try component A",
        summary="Apply component A.",
        created_in_session_id="session_0001",
    )


def test_project_config_repository_set_get_and_update(repos: Repositories) -> None:
    config = create_project_config(repos)

    assert config.id == "project_test"
    assert config.repo_path == "/tmp/project"
    assert config.known_signals == ["score", "latency_ms"]
    created_at = config.created_at

    updated = repos.project_config.set(
        evaluation_context="Run a JSON eval with guardrails.",
        known_signals=["score"],
        experiment_scope="Baseline only.",
    )

    assert updated.known_signals == ["score"]
    assert updated.created_at == created_at
    assert repos.project_config.get() == updated


def test_objectives_repository_create_update_get_and_list(repos: Repositories) -> None:
    objective = create_objective(repos)

    assert objective.id == "objective_0001"
    assert objective.title == "Improve score"
    assert objective.status == "active"

    updated = repos.objectives.update(
        "objective_0001",
        title="Improve score safely",
        status="closed",
    )
    assert updated is not None
    assert updated.title == "Improve score safely"
    assert updated.status == "closed"
    assert repos.objectives.get("objective_0001") == updated
    assert [item.id for item in repos.objectives.list_all()] == ["objective_0001"]


def test_sessions_repository_create_update_get_and_list(repos: Repositories) -> None:
    session = create_session(repos)

    assert session.id == "session_0001"
    assert session.objective_id == "objective_0001"
    assert session.status == "active"

    updated = repos.sessions.update_status("session_0001", "closed")
    assert updated is not None
    assert updated.status == "closed"
    assert repos.sessions.get("session_0001") == updated
    assert [item.id for item in repos.sessions.list_for_objective("objective_0001")] == [
        "session_0001"
    ]


def test_hypotheses_repository_create_update_get_and_list(repos: Repositories) -> None:
    hypothesis = create_hypothesis(repos)

    assert hypothesis.id == "hyp_0001"
    assert hypothesis.objective_id == "objective_0001"
    assert hypothesis.status == "active"

    updated = repos.hypotheses.update(
        "hyp_0001",
        summary="Component A helped in first result.",
        status="closed",
    )
    assert updated is not None
    assert updated.summary == "Component A helped in first result."
    assert updated.status == "closed"
    assert repos.hypotheses.get("hyp_0001") == updated
    assert [item.id for item in repos.hypotheses.list_for_objective("objective_0001")] == [
        "hyp_0001"
    ]


def test_experiments_repository_create_update_get_and_list(repos: Repositories) -> None:
    experiment = create_experiment(repos)

    assert experiment.id == "exp_session_0001_a"
    assert experiment.status == "open"
    assert experiment.title == "Try component A"
    assert experiment.created_in_session_id == "session_0001"

    updated = repos.experiments.update(
        "exp_session_0001_a",
        status="closed",
        summary="A improved score.",
    )
    assert updated is not None
    assert updated.status == "closed"
    assert updated.summary == "A improved score."
    assert repos.experiments.get("exp_session_0001_a") == updated
    assert [item.id for item in repos.experiments.list_for_session("session_0001")] == [
        "exp_session_0001_a"
    ]
    assert [item.id for item in repos.experiments.list_for_objective("objective_0001")] == [
        "exp_session_0001_a"
    ]


def test_hypothesis_experiment_links_repository_create_and_list(
    repos: Repositories,
) -> None:
    create_experiment(repos)

    link = repos.hypothesis_experiment_links.create(
        hypothesis_id="hyp_0001",
        experiment_id="exp_session_0001_a",
        note="first attempt",
    )

    assert link.hypothesis_id == "hyp_0001"
    assert link.experiment_id == "exp_session_0001_a"
    assert repos.hypothesis_experiment_links.get(
        "hyp_0001",
        "exp_session_0001_a",
    ) == link
    assert repos.hypothesis_experiment_links.list_for_hypothesis("hyp_0001") == [link]
    assert repos.hypothesis_experiment_links.list_for_experiment("exp_session_0001_a") == [
        link
    ]


def test_hypothesis_activities_repository_add_and_list(repos: Repositories) -> None:
    create_hypothesis(repos)

    activity = repos.hypothesis_activities.add(
        hypothesis_id="hyp_0001",
        session_id="session_0001",
        actor="agent",
        kind="update",
        body="A looks worth trying.",
        payload={"experiment_id": "exp_session_0001_a"},
    )

    assert activity.id == 1
    assert activity.payload == {"experiment_id": "exp_session_0001_a"}
    assert repos.hypothesis_activities.list_for_hypothesis("hyp_0001") == [activity]
    assert repos.hypothesis_activities.list_for_session("session_0001") == [activity]


def test_experiment_activities_repository_add_and_list(repos: Repositories) -> None:
    create_experiment(repos)

    activity = repos.experiment_activities.add(
        experiment_id="exp_session_0001_a",
        session_id="session_0001",
        actor="worker",
        kind="result",
        body="A improved score.",
        payload={"signals": [{"key": "score", "value": 0.73}]},
    )

    assert activity.id == 1
    assert activity.kind == "result"
    assert repos.experiment_activities.list_for_experiment("exp_session_0001_a") == [
        activity
    ]
    assert repos.experiment_activities.list_for_session("session_0001") == [activity]


def test_artifacts_repository_create_and_list(repos: Repositories) -> None:
    create_experiment(repos)
    activity = repos.experiment_activities.add(
        experiment_id="exp_session_0001_a",
        session_id="session_0001",
        actor="worker",
        kind="result",
        body="A improved score.",
    )

    artifact = repos.artifacts.create(
        artifact_id="artifact_0001",
        objective_id="objective_0001",
        session_id="session_0001",
        experiment_id="exp_session_0001_a",
        experiment_activity_id=activity.id,
        kind="json",
        title="raw eval output",
        path="artifacts/raw.json",
        media_type="application/json",
        size_bytes=120,
    )

    assert artifact.id == "artifact_0001"
    assert artifact.experiment_activity_id == activity.id
    assert repos.artifacts.get("artifact_0001") == artifact
    assert repos.artifacts.list_for_session("session_0001") == [artifact]
    assert repos.artifacts.list_for_experiment("exp_session_0001_a") == [artifact]


def test_events_repository_add_and_list(repos: Repositories) -> None:
    create_session(repos)

    event = repos.events.add(
        event_type="session.started",
        message="Started session_0001",
        session_id="session_0001",
        payload={"session_id": "session_0001"},
    )

    assert event.id == 1
    assert event.type == "session.started"
    assert event.payload == {"session_id": "session_0001"}
    assert repos.events.list_for_session("session_0001") == [event]
    assert repos.events.list_all() == [event]


def test_agent_message_history_repository_appends_and_reconstructs(
    repos: Repositories,
) -> None:
    create_session(repos)

    first = repos.agent_message_history.append_session_messages(
        session_id="session_0001",
        agent_name="almanac_research_planner",
        messages_json=(
            b'[{"kind":"request","run_id":"pydantic_run_1",'
            b'"conversation_id":"conversation_1"}]'
        ),
    )
    second = repos.agent_message_history.append_session_messages(
        session_id="session_0001",
        agent_name="almanac_research_planner",
        messages_json='[{"kind":"response","run_id":"pydantic_run_1","conversation_id":"conversation_1"}]',
    )

    assert first.id == 1
    assert first.message_count == 1
    assert first.pydantic_run_id == "pydantic_run_1"
    assert first.conversation_id == "conversation_1"
    assert second.id == 2
    assert repos.agent_message_history.get_message_history(
        "session_0001",
        agent_name="almanac_research_planner",
    ) == [
        {"kind": "request", "run_id": "pydantic_run_1", "conversation_id": "conversation_1"},
        {"kind": "response", "run_id": "pydantic_run_1", "conversation_id": "conversation_1"},
    ]


def test_current_state_api_composes_protocol_shaped_state(repos: Repositories) -> None:
    create_experiment(repos)
    repos.hypothesis_experiment_links.create(
        hypothesis_id="hyp_0001",
        experiment_id="exp_session_0001_a",
    )
    repos.experiment_activities.add(
        experiment_id="exp_session_0001_a",
        session_id="session_0001",
        actor="worker",
        kind="result",
        body="A improved score.",
        payload={"signals": [{"key": "score", "value": 0.73}]},
    )
    repos.events.add(
        event_type="experiment.completed",
        message="Completed exp_session_0001_a",
        session_id="session_0001",
        payload={"experiment_id": "exp_session_0001_a"},
    )

    current_state = CurrentStateService(repos=repos).get()
    assert current_state.config is not None
    assert current_state.config.id == "project_test"
    assert [objective.id for objective in current_state.objectives] == ["objective_0001"]
    assert [session.id for session in current_state.sessions] == ["session_0001"]
    assert [hypothesis.id for hypothesis in current_state.hypotheses] == ["hyp_0001"]
    assert [experiment.id for experiment in current_state.experiments] == [
        "exp_session_0001_a"
    ]
    assert [activity.kind for activity in current_state.experiment_activities] == [
        "result"
    ]
    assert [event.type for event in current_state.events] == ["experiment.completed"]


def test_sessions_api_composes_session_graph(repos: Repositories) -> None:
    create_experiment(repos)
    repos.hypothesis_experiment_links.create(
        hypothesis_id="hyp_0001",
        experiment_id="exp_session_0001_a",
    )
    repos.hypothesis_activities.add(
        hypothesis_id="hyp_0001",
        session_id="session_0001",
        actor="agent",
        kind="update",
        body="A is active.",
    )
    repos.experiment_activities.add(
        experiment_id="exp_session_0001_a",
        session_id="session_0001",
        actor="worker",
        kind="result",
        body="A improved score.",
    )

    graph = SessionsService(repos=repos).get_session("session_0001")

    assert graph.config is not None
    assert graph.objective is not None
    assert graph.session is not None
    assert graph.session.id == "session_0001"
    assert [hypothesis.id for hypothesis in graph.hypotheses] == ["hyp_0001"]
    assert [experiment.id for experiment in graph.experiments] == [
        "exp_session_0001_a"
    ]
    assert [activity.kind for activity in graph.experiment_activities] == [
        "result"
    ]
