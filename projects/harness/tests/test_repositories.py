from __future__ import annotations

from pathlib import Path

import pytest
from situ.harness.api.current_state import CurrentStateService
from situ.harness.api.sessions import SessionsService
from situ.harness.core.db import Database
from situ.harness.records import (
    EvaluationRecord,
    ExperimentRecord,
    HypothesisRecord,
    ObjectiveRecord,
    ProjectRecord,
    ResearchContextRecord,
    SessionRecord,
)
from situ.harness.repositories import Repositories


@pytest.fixture
def repos(tmp_path: Path) -> Repositories:
    db = Database(
        tmp_path / "situ.sqlite",
        project_id="project_test",
        repo_path="/tmp/project",
    )
    return Repositories.create(db)


def create_project(repos: Repositories) -> ProjectRecord:
    return repos.project.ensure()


def create_session(
    repos: Repositories,
    session_id: str = "session_0001",
) -> SessionRecord:
    project = create_project(repos)
    return repos.sessions.create(session_id, project_id=project.id)


def create_objective(repos: Repositories) -> ObjectiveRecord:
    session = create_session(repos)
    return repos.objectives.create(
        objective_id="objective_0001",
        session_id=session.id,
        title="Improve score",
        description="Improve score without hurting latency.",
    )


def create_research_context(repos: Repositories) -> ResearchContextRecord:
    session = repos.sessions.get("session_0001") or create_session(repos)
    return repos.research_contexts.create(
        research_context_id="rctx_0001",
        session_id=session.id,
        body="Run a JSON eval. Expected signals: score, latency_ms.",
    )


def create_hypothesis(repos: Repositories) -> HypothesisRecord:
    create_objective(repos)
    return repos.hypotheses.create(
        hypothesis_id="hyp_0001",
        session_id="session_0001",
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
        session_id="session_0001",
        title="Try component A",
        summary="Apply component A.",
    )


def create_evaluation(repos: Repositories) -> EvaluationRecord:
    create_experiment(repos)
    return repos.evaluations.create(
        evaluation_id="eval_session_0001_baseline",
        session_id="session_0001",
        title="Baseline project eval",
        summary="Run the baseline project evaluation.",
    )


def test_project_repository_ensure_get_and_idempotent(repos: Repositories) -> None:
    project = create_project(repos)

    assert project.id == "project_test"
    assert project.repo_path == "/tmp/project"
    created_at = project.created_at

    again = repos.project.ensure()
    assert again.id == project.id
    assert again.created_at == created_at
    assert repos.project.get() == again


def test_research_contexts_repository_create_update_get(repos: Repositories) -> None:
    research_context = create_research_context(repos)

    assert research_context.id == "rctx_0001"
    assert research_context.session_id == "session_0001"
    assert "score" in research_context.body

    updated = repos.research_contexts.update(
        "rctx_0001",
        body="Refined: focus on score, ignore latency.",
    )
    assert updated is not None
    assert "Refined" in updated.body
    assert repos.research_contexts.get_for_session("session_0001") == updated


def test_objectives_repository_create_update_get_and_list(repos: Repositories) -> None:
    objective = create_objective(repos)

    assert objective.id == "objective_0001"
    assert objective.session_id == "session_0001"
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
    assert repos.objectives.get_for_session("session_0001") == updated


def test_sessions_repository_create_update_get_and_list(repos: Repositories) -> None:
    session = create_session(repos)

    assert session.id == "session_0001"
    assert session.project_id == "project_test"
    assert session.status == "active"

    updated = repos.sessions.update_status("session_0001", "closed")
    assert updated is not None
    assert updated.status == "closed"
    assert repos.sessions.get("session_0001") == updated
    assert [item.id for item in repos.sessions.list_for_project("project_test")] == [
        "session_0001"
    ]


def test_hypotheses_repository_create_update_get_and_list(repos: Repositories) -> None:
    hypothesis = create_hypothesis(repos)

    assert hypothesis.id == "hyp_0001"
    assert hypothesis.session_id == "session_0001"
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
    assert [item.id for item in repos.hypotheses.list_for_session("session_0001")] == [
        "hyp_0001"
    ]


def test_experiments_repository_create_update_get_and_list(repos: Repositories) -> None:
    experiment = create_experiment(repos)

    assert experiment.id == "exp_session_0001_a"
    assert experiment.session_id == "session_0001"
    assert experiment.status == "open"
    assert experiment.title == "Try component A"

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


def test_evaluations_repository_create_update_get_and_list(repos: Repositories) -> None:
    evaluation = create_evaluation(repos)

    assert evaluation.id == "eval_session_0001_baseline"
    assert evaluation.session_id == "session_0001"
    assert evaluation.status == "open"
    assert evaluation.title == "Baseline project eval"
    assert evaluation.associated_experiment_id is None

    updated = repos.evaluations.update(
        "eval_session_0001_baseline",
        status="closed",
        summary="Baseline result recorded.",
        associated_experiment_id="exp_session_0001_a",
    )
    assert updated is not None
    assert updated.status == "closed"
    assert updated.summary == "Baseline result recorded."
    assert updated.associated_experiment_id == "exp_session_0001_a"
    assert repos.evaluations.get("eval_session_0001_baseline") == updated
    assert [item.id for item in repos.evaluations.list_for_session("session_0001")] == [
        "eval_session_0001_baseline"
    ]
    assert [item.id for item in repos.evaluations.list_for_experiment("exp_session_0001_a")] == [
        "eval_session_0001_baseline"
    ]


def test_work_repositories_reject_invalid_agent_statuses(
    repos: Repositories,
) -> None:
    create_experiment(repos)

    with pytest.raises(ValueError, match="invalid experiment status"):
        repos.experiments.update(
            experiment_id="exp_session_0001_a",
            status="completed",
        )

    with pytest.raises(ValueError, match="Record result details"):
        repos.experiments.create(
            experiment_id="exp_session_0001_b",
            session_id="session_0001",
            title="Try component B",
            summary="Apply component B.",
            status="running",
        )

    with pytest.raises(ValueError, match="invalid hypothesis status"):
        repos.hypotheses.update(
            hypothesis_id="hyp_0001",
            status="completed",
        )

    with pytest.raises(ValueError, match="invalid evaluation status"):
        repos.evaluations.create(
            evaluation_id="eval_session_0001_bad",
            session_id="session_0001",
            title="Bad evaluation",
            summary="This should fail.",
            status="running",
        )


def test_core_repositories_reject_invalid_statuses(repos: Repositories) -> None:
    create_objective(repos)

    with pytest.raises(ValueError, match="invalid objective status"):
        repos.objectives.update(
            objective_id="objective_0001",
            status="completed",
        )

    with pytest.raises(ValueError, match="invalid session status"):
        repos.sessions.update_status(
            session_id="session_0001",
            status="completed",
        )


def test_experiments_repository_accepts_work_status_enum(
    repos: Repositories,
) -> None:
    from situ.harness.records import WorkStatus

    create_hypothesis(repos)
    experiment = repos.experiments.create(
        experiment_id="exp_session_0001_b",
        session_id="session_0001",
        title="Try component B",
        summary="Apply component B.",
        status=WorkStatus.ACTIVE,
    )

    updated = repos.experiments.update(
        experiment_id="exp_session_0001_b",
        status=WorkStatus.CLOSED,
    )

    assert experiment.status == "active"
    assert updated is not None
    assert updated.status == "closed"


def test_hypothesis_experiment_links_repository_create_and_list(
    repos: Repositories,
) -> None:
    create_experiment(repos)

    link = repos.hypothesis_experiment_links.create(
        hypothesis_id="hyp_0001",
        experiment_id="exp_session_0001_a",
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
        actor="agent",
        kind="comment",
        body="A looks worth trying.",
        payload={"experiment_id": "exp_session_0001_a"},
    )

    assert activity.id == 1
    assert activity.payload == {"experiment_id": "exp_session_0001_a"}
    assert repos.hypothesis_activities.list_for_hypothesis("hyp_0001") == [activity]


def test_experiment_activities_repository_add_and_list(repos: Repositories) -> None:
    create_experiment(repos)

    activity = repos.experiment_activities.add(
        experiment_id="exp_session_0001_a",
        actor="worker",
        kind="comment",
        body="A improved score.",
        payload={
            "activity_type": "result",
            "signals": [{"key": "score", "value": 0.73}],
        },
    )

    assert activity.id == 1
    assert activity.kind == "comment"
    assert repos.experiment_activities.list_for_experiment("exp_session_0001_a") == [
        activity
    ]


def test_evaluation_activities_repository_add_and_list(repos: Repositories) -> None:
    create_evaluation(repos)

    activity = repos.evaluation_activities.add(
        evaluation_id="eval_session_0001_baseline",
        actor="agent",
        kind="comment",
        body="Baseline result recorded.",
        payload={
            "activity_type": "result",
            "signals": [{"key": "score", "value": 0.71}],
        },
    )

    assert activity.id == 1
    assert activity.kind == "comment"
    assert repos.evaluation_activities.list_for_evaluation(
        "eval_session_0001_baseline"
    ) == [activity]


def test_artifacts_repository_create_and_list(repos: Repositories) -> None:
    create_experiment(repos)
    activity = repos.experiment_activities.add(
        experiment_id="exp_session_0001_a",
        actor="worker",
        kind="comment",
        body="A improved score.",
    )

    artifact = repos.artifacts.create(
        artifact_id="artifact_0001",
        session_id="session_0001",
        associated_entity_kind="experiment_activity",
        associated_entity_id=str(activity.id),
        kind="json",
        title="raw eval output",
        path="artifacts/raw.json",
        media_type="application/json",
        size_bytes=120,
    )

    assert artifact.id == "artifact_0001"
    assert artifact.session_id == "session_0001"
    assert artifact.associated_entity_kind == "experiment_activity"
    assert artifact.associated_entity_id == str(activity.id)
    assert repos.artifacts.get("artifact_0001") == artifact
    assert repos.artifacts.list_for_session("session_0001") == [artifact]


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
        agent_name="situ-research-planner",
        messages_json=(
            b'[{"kind":"request","run_id":"pydantic_run_1",'
            b'"conversation_id":"conversation_1"}]'
        ),
    )
    second = repos.agent_message_history.append_session_messages(
        session_id="session_0001",
        agent_name="situ-research-planner",
        messages_json='[{"kind":"response","run_id":"pydantic_run_1","conversation_id":"conversation_1"}]',
    )

    assert first.id == 1
    assert first.pydantic_run_id == "pydantic_run_1"
    assert first.conversation_id == "conversation_1"
    assert second.id == 2
    assert repos.agent_message_history.get_message_history(
        "session_0001",
        agent_name="situ-research-planner",
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
        actor="worker",
        kind="comment",
        body="A improved score.",
        payload={
            "activity_type": "result",
            "signals": [{"key": "score", "value": 0.73}],
        },
    )
    repos.evaluations.create(
        evaluation_id="eval_session_0001_baseline",
        session_id="session_0001",
        title="Baseline project eval",
        summary="Run the baseline project evaluation.",
    )
    repos.evaluation_activities.add(
        evaluation_id="eval_session_0001_baseline",
        actor="agent",
        kind="comment",
        body="Baseline result recorded.",
        payload={"activity_type": "result"},
    )
    repos.events.add(
        event_type="experiment.completed",
        message="Completed exp_session_0001_a",
        session_id="session_0001",
        payload={"experiment_id": "exp_session_0001_a"},
    )

    current_state = CurrentStateService(repos=repos).get()
    assert current_state.project is not None
    assert current_state.project.id == "project_test"
    assert [objective.id for objective in current_state.objectives] == ["objective_0001"]
    assert [session.id for session in current_state.sessions] == ["session_0001"]
    assert [hypothesis.id for hypothesis in current_state.hypotheses] == ["hyp_0001"]
    assert [experiment.id for experiment in current_state.experiments] == [
        "exp_session_0001_a"
    ]
    assert [evaluation.id for evaluation in current_state.evaluations] == [
        "eval_session_0001_baseline"
    ]
    assert [activity.kind for activity in current_state.experiment_activities] == [
        "comment"
    ]
    assert [activity.kind for activity in current_state.evaluation_activities] == [
        "comment"
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
        actor="agent",
        kind="comment",
        body="A is active.",
    )
    repos.experiment_activities.add(
        experiment_id="exp_session_0001_a",
        actor="worker",
        kind="comment",
        body="A improved score.",
    )
    repos.evaluations.create(
        evaluation_id="eval_session_0001_baseline",
        session_id="session_0001",
        title="Baseline project eval",
        summary="Run the baseline project evaluation.",
    )
    repos.evaluation_activities.add(
        evaluation_id="eval_session_0001_baseline",
        actor="agent",
        kind="comment",
        body="Baseline result recorded.",
    )

    graph = SessionsService(repos=repos).get_session("session_0001")

    assert graph.project is not None
    assert graph.objective is not None
    assert graph.session is not None
    assert graph.session.id == "session_0001"
    assert [hypothesis.id for hypothesis in graph.hypotheses] == ["hyp_0001"]
    assert [experiment.id for experiment in graph.experiments] == [
        "exp_session_0001_a"
    ]
    assert [evaluation.id for evaluation in graph.evaluations] == [
        "eval_session_0001_baseline"
    ]
    assert [activity.kind for activity in graph.experiment_activities] == [
        "comment"
    ]
    assert [activity.kind for activity in graph.evaluation_activities] == [
        "comment"
    ]
