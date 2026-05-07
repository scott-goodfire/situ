from __future__ import annotations

from pathlib import Path

import pytest
from situ.harness.api.current_state import CurrentStateService
from situ.harness.api.project_board import ProjectBoardService
from situ.harness.api.sessions import SessionsService
from situ.harness.core.db import Database
from situ.harness.records import (
    AnalysisRecord,
    BaselineRecord,
    EvaluationRecord,
    ExperimentRecord,
    HypothesisRecord,
    ProjectRecord,
    SessionRecord,
    MeasurementRecord,
    WorkspaceRecord,
)
from situ.harness.repositories import Repositories


@pytest.fixture
def repos(tmp_path: Path) -> Repositories:
    db = Database(
        tmp_path / "situ.sqlite",
        workspace_id="workspace_test",
        repo_path="/tmp/project",
    )
    return Repositories.create(db)


def create_workspace(repos: Repositories) -> WorkspaceRecord:
    return repos.workspaces.ensure()


def create_project(
    repos: Repositories,
    project_id: str = "P1",
) -> ProjectRecord:
    workspace = create_workspace(repos)
    existing = repos.projects.get(project_id=project_id)
    if existing is not None:
        return existing
    return repos.projects.create(
        project_id=project_id,
        workspace_id=workspace.id,
        title="Improve score",
        objective="Improve score without hurting latency.",
        research_context="Run a JSON eval. Expected signals: score, latency_ms.",
    )


def create_session(
    repos: Repositories,
    session_id: str = "S1",
) -> SessionRecord:
    workspace = create_workspace(repos)
    project = create_project(repos)
    existing = repos.sessions.get(session_id=session_id)
    if existing is not None:
        return existing
    return repos.sessions.create(
        session_id=session_id,
        workspace_id=workspace.id,
        project_id=project.id,
    )


def create_hypothesis(repos: Repositories) -> HypothesisRecord:
    project = create_project(repos)
    session = create_session(repos)
    existing = repos.hypotheses.get(hypothesis_id="H1")
    if existing is not None:
        return existing
    return repos.hypotheses.create(
        hypothesis_id="H1",
        project_id=project.id,
        created_in_session_id=session.id,
        title="Component A helps",
        summary="Component A may improve score.",
        status="active",
    )


def create_experiment(
    repos: Repositories,
    experiment_id: str = "EX1",
) -> ExperimentRecord:
    project = create_project(repos)
    session = create_session(repos)
    create_hypothesis(repos)
    existing = repos.experiments.get(experiment_id=experiment_id)
    if existing is not None:
        return existing
    return repos.experiments.create(
        experiment_id=experiment_id,
        project_id=project.id,
        created_in_session_id=session.id,
        title="Try component A",
        summary="Apply component A.",
    )


def create_baseline(
    repos: Repositories,
    baseline_id: str = "B1",
) -> BaselineRecord:
    project = create_project(repos)
    session = create_session(repos)
    existing = repos.baselines.get(baseline_id=baseline_id)
    if existing is not None:
        return existing
    return repos.baselines.create(
        baseline_id=baseline_id,
        project_id=project.id,
        created_in_session_id=session.id,
        title="Current workspace baseline",
        summary="Reference behavior before candidate changes.",
    )


def create_evaluation(repos: Repositories) -> EvaluationRecord:
    project = create_project(repos)
    session = create_session(repos)
    baseline = create_baseline(repos)
    return repos.evaluations.create(
        evaluation_id="EV1",
        project_id=project.id,
        created_in_session_id=session.id,
        title="Baseline project eval",
        summary="Run the baseline project evaluation.",
        associated_baseline_id=baseline.id,
    )


def create_measurement(repos: Repositories) -> MeasurementRecord:
    evaluation = create_evaluation(repos)
    return repos.measurements.add(
        evaluation_id=evaluation.id,
        created_in_session_id="S1",
        actor="agent",
        body="Baseline result recorded.",
        payload={"metrics": {"score": 0.71}},
    )


def create_analysis(repos: Repositories) -> AnalysisRecord:
    project = create_project(repos)
    session = create_session(repos)
    existing = repos.analyses.get(analysis_id="A1")
    if existing is not None:
        return existing
    return repos.analyses.create(
        analysis_id="A1",
        project_id=project.id,
        created_in_session_id=session.id,
        created_by_agent_id=None,
        title="Codebase map",
        summary="Mapped the backend primitives.",
        content="Project-owned records represent durable research state.",
        status="active",
    )


def test_repositories_generate_canonical_short_ids(repos: Repositories) -> None:
    project = create_project(repos)
    session = create_session(repos)

    assert repos.projects.next_id(workspace_id=project.workspace_id) == "P2"
    assert repos.sessions.next_id() == "S2"
    assert repos.analyses.next_id(project_id=project.id) == "A1"
    assert repos.hypotheses.next_id(project_id=project.id) == "H1"
    assert repos.baselines.next_id(project_id=project.id) == "B1"
    assert repos.experiments.next_id(project_id=project.id) == "EX1"
    assert repos.evaluations.next_id(project_id=project.id) == "EV1"
    assert repos.artifacts.next_id(project_id=project.id) == "ART1"
    assert repos.tasks.next_id(project_id=project.id) == "T1"

    task = repos.tasks.create(
        task_id=repos.tasks.next_id(project_id=project.id),
        project_id=project.id,
        created_in_session_id=session.id,
        title="Plan next step",
        content="Review project state and file the next task.",
        kind="plan",
    )

    assert task.id == "T1"
    assert repos.tasks.next_id(project_id=project.id) == "T2"


def test_tasks_repository_requeue_moves_task_back_to_backlog(
    repos: Repositories,
) -> None:
    project = create_project(repos)
    session = create_session(repos)
    manager = repos.agents.ensure_project_agent(
        project_id=project.id,
        created_in_session_id=session.id,
        kind="manager",
        display_name="Manager",
    )
    task = repos.tasks.create(
        task_id="T1",
        project_id=project.id,
        created_in_session_id=session.id,
        title="Plan next step",
        content="File first work.",
        kind="plan",
        priority="high",
        source_kind="system",
        payload={"reuse_key": "project-next-step", "planning_pass_count": 1},
    )
    claimed = repos.tasks.claim(
        task_id=task.id,
        agent_id=manager.id,
        eligible_kinds=["plan"],
        claimed_in_session_id=session.id,
    )
    assert claimed is not None
    done = repos.tasks.update(
        task_id=task.id,
        status="done",
        result_summary="First pass completed.",
        completed_in_session_id=session.id,
    )
    assert done is not None
    assert done.status == "done"

    requeued = repos.tasks.requeue(
        task_id=task.id,
        content="File the next runnable work.",
        payload={"reuse_key": "project-next-step", "planning_pass_count": 2},
    )

    assert requeued is not None
    assert requeued.id == task.id
    assert requeued.status == "backlog"
    assert requeued.assignee_id is None
    assert requeued.claimed_in_session_id is None
    assert requeued.claimed_at is None
    assert requeued.completed_in_session_id is None
    assert requeued.completed_at is None
    assert requeued.result_summary is None
    assert requeued.content == "File the next runnable work."
    assert requeued.payload["planning_pass_count"] == 2


def test_database_hard_resets_legacy_product_record_ids(tmp_path: Path) -> None:
    db_path = tmp_path / "situ.sqlite"
    db = Database(
        db_path,
        workspace_id="workspace_test",
        repo_path="/tmp/project",
    )
    repos = Repositories.create(db)
    project = create_project(repos)
    db.execute(
        "UPDATE projects SET id = ? WHERE id = ?",
        ("project_legacy_001", project.id),
    )
    db.close()

    reopened = Database(
        db_path,
        workspace_id="workspace_test",
        repo_path="/tmp/project",
    )
    reopened_repos = Repositories.create(reopened)

    try:
        assert reopened_repos.projects.list_all() == []
        assert reopened_repos.workspaces.get() is None
    finally:
        reopened.close()


def test_workspace_repository_ensure_get_and_idempotent(repos: Repositories) -> None:
    workspace = create_workspace(repos)

    assert workspace.id == "workspace_test"
    assert workspace.repo_path == "/tmp/project"
    created_at = workspace.created_at

    again = repos.workspaces.ensure()
    assert again.id == workspace.id
    assert again.created_at == created_at
    assert repos.workspaces.get() == again


def test_projects_repository_create_update_get_and_list(repos: Repositories) -> None:
    project = create_project(repos)

    assert project.id == "P1"
    assert project.workspace_id == "workspace_test"
    assert project.title == "Improve score"
    assert "latency" in project.objective
    assert "score" in project.research_context
    assert project.status == "active"

    updated = repos.projects.update(
        project_id="P1",
        title="Improve score safely",
        research_context="Refined: focus on score, ignore latency.",
        status="closed",
    )
    assert updated is not None
    assert updated.title == "Improve score safely"
    assert "Refined" in updated.research_context
    assert updated.status == "closed"
    assert repos.projects.get(project_id="P1") == updated
    assert [item.id for item in repos.projects.list_all()] == ["P1"]
    assert [item.id for item in repos.projects.list_for_workspace(workspace_id="workspace_test")] == [
        "P1"
    ]


def test_sessions_repository_create_update_get_and_list(repos: Repositories) -> None:
    session = create_session(repos)

    assert session.id == "S1"
    assert session.workspace_id == "workspace_test"
    assert session.project_id == "P1"
    assert session.status == "active"

    projectless = repos.sessions.create(
        session_id="S2",
        workspace_id="workspace_test",
    )
    assert projectless.project_id is None
    attached = repos.sessions.update_project(session_id="S2", project_id="P1")
    assert attached is not None
    assert attached.project_id == "P1"

    updated = repos.sessions.update_status(session_id="S1", status="closed")
    assert updated is not None
    assert updated.status == "closed"
    assert repos.sessions.get(session_id="S1") == updated
    assert [item.id for item in repos.sessions.list_for_workspace(workspace_id="workspace_test")] == [
        "S1",
        "S2",
    ]
    assert [item.id for item in repos.sessions.list_for_project(project_id="P1")] == [
        "S1",
        "S2",
    ]


def test_hypotheses_repository_create_update_get_and_list(repos: Repositories) -> None:
    hypothesis = create_hypothesis(repos)

    assert hypothesis.id == "H1"
    assert hypothesis.project_id == "P1"
    assert hypothesis.created_in_session_id == "S1"
    assert hypothesis.status == "active"

    updated = repos.hypotheses.update(
        hypothesis_id="H1",
        summary="Component A helped in first result.",
        status="closed",
    )
    assert updated is not None
    assert updated.summary == "Component A helped in first result."
    assert updated.status == "closed"
    assert repos.hypotheses.get(hypothesis_id="H1") == updated
    assert [item.id for item in repos.hypotheses.list_for_project(project_id="P1")] == [
        "H1"
    ]
    assert [item.id for item in repos.hypotheses.list_for_session(session_id="S1")] == [
        "H1"
    ]


def test_experiments_repository_create_update_get_and_list(repos: Repositories) -> None:
    experiment = create_experiment(repos)

    assert experiment.id == "EX1"
    assert experiment.project_id == "P1"
    assert experiment.created_in_session_id == "S1"
    assert experiment.status == "open"
    assert experiment.title == "Try component A"
    assert experiment.worktree_path is None
    assert experiment.base_commit is None
    assert experiment.candidate_commit is None
    assert experiment.parent_experiment_id is None
    assert experiment.research_thread is None

    updated = repos.experiments.update(
        experiment_id="EX1",
        status="closed",
        summary="A improved score.",
        worktree_path="/tmp/worktree/EX1",
        base_commit="abc123",
        candidate_commit="def456",
        research_thread="optimizer",
    )
    assert updated is not None
    assert updated.status == "closed"
    assert updated.summary == "A improved score."
    assert updated.worktree_path == "/tmp/worktree/EX1"
    assert updated.base_commit == "abc123"
    assert updated.candidate_commit == "def456"
    assert updated.research_thread == "optimizer"
    assert repos.experiments.get(experiment_id="EX1") == updated
    assert [item.id for item in repos.experiments.list_for_project(project_id="P1")] == [
        "EX1"
    ]
    assert [item.id for item in repos.experiments.list_for_session(session_id="S1")] == [
        "EX1"
    ]

    child = repos.experiments.create(
        experiment_id="EX2",
        project_id="P1",
        created_in_session_id="S1",
        title="Continue component A",
        summary="Build on the prior candidate.",
        parent_experiment_id="EX1",
        research_thread="optimizer",
        base_commit="def456",
    )
    assert child.parent_experiment_id == "EX1"
    assert child.research_thread == "optimizer"
    assert child.base_commit == "def456"


def test_baselines_repository_create_update_get_and_list(repos: Repositories) -> None:
    baseline = create_baseline(repos)

    assert baseline.id == "B1"
    assert baseline.project_id == "P1"
    assert baseline.created_in_session_id == "S1"
    assert baseline.status == "open"
    assert baseline.title == "Current workspace baseline"

    updated = repos.baselines.update(
        baseline_id="B1",
        status="closed",
        summary="Baseline accepted for comparison.",
    )
    assert updated is not None
    assert updated.status == "closed"
    assert updated.summary == "Baseline accepted for comparison."
    assert repos.baselines.get(baseline_id="B1") == updated
    assert [item.id for item in repos.baselines.list_for_project(project_id="P1")] == [
        "B1"
    ]
    assert [item.id for item in repos.baselines.list_for_session(session_id="S1")] == [
        "B1"
    ]


def test_evaluations_repository_create_update_get_and_list(repos: Repositories) -> None:
    evaluation = create_evaluation(repos)

    assert evaluation.id == "EV1"
    assert evaluation.project_id == "P1"
    assert evaluation.created_in_session_id == "S1"
    assert evaluation.status == "open"
    assert evaluation.title == "Baseline project eval"
    assert evaluation.associated_baseline_id == "B1"
    assert evaluation.associated_experiment_id is None

    create_experiment(repos)
    updated = repos.evaluations.update(
        evaluation_id="EV1",
        status="closed",
        summary="Baseline result recorded.",
        associated_experiment_id="EX1",
    )
    assert updated is not None
    assert updated.status == "closed"
    assert updated.summary == "Baseline result recorded."
    assert updated.associated_baseline_id is None
    assert updated.associated_experiment_id == "EX1"
    assert repos.evaluations.get(evaluation_id="EV1") == updated
    assert [item.id for item in repos.evaluations.list_for_project(project_id="P1")] == [
        "EV1"
    ]
    assert [item.id for item in repos.evaluations.list_for_session(session_id="S1")] == [
        "EV1"
    ]
    assert [item.id for item in repos.evaluations.list_for_experiment(experiment_id="EX1")] == [
        "EV1"
    ]

    baseline_again = repos.evaluations.update(
        evaluation_id="EV1",
        associated_baseline_id="B1",
    )
    assert baseline_again is not None
    assert baseline_again.associated_baseline_id == "B1"
    assert baseline_again.associated_experiment_id is None
    assert [item.id for item in repos.evaluations.list_for_baseline(
        baseline_id="B1"
    )] == ["EV1"]


def test_analyses_repository_create_update_get_and_list(repos: Repositories) -> None:
    analysis = create_analysis(repos)

    assert analysis.id == "A1"
    assert analysis.project_id == "P1"
    assert analysis.created_in_session_id == "S1"
    assert analysis.created_by_agent_id is None
    assert analysis.status == "active"
    assert "backend primitives" in analysis.summary

    updated = repos.analyses.update(
        analysis_id="A1",
        status="closed",
        summary="Synthesized codebase map into design constraints.",
        content="The main knobs are repository records, tools, and protocol schemas.",
    )
    assert updated is not None
    assert updated.status == "closed"
    assert "design constraints" in updated.summary
    assert repos.analyses.get(analysis_id="A1") == updated
    assert [item.id for item in repos.analyses.list_for_project(project_id="P1")] == [
        "A1"
    ]
    assert [item.id for item in repos.analyses.list_for_session(session_id="S1")] == [
        "A1"
    ]

    superseding = repos.analyses.create(
        analysis_id="A2",
        project_id="P1",
        created_in_session_id="S1",
        title="Updated codebase map",
        summary="Second pass replaced the first map.",
        content="This note supersedes the initial map.",
        supersedes_analysis_id="A1",
    )
    assert superseding.supersedes_analysis_id == "A1"


def test_work_repositories_reject_invalid_agent_statuses(
    repos: Repositories,
) -> None:
    create_experiment(repos)

    with pytest.raises(ValueError, match="invalid experiment status"):
        repos.experiments.update(
            experiment_id="EX1",
            status="completed",
        )

    with pytest.raises(ValueError, match="Record result details"):
        repos.experiments.create(
            experiment_id="EX2",
            project_id="P1",
            created_in_session_id="S1",
            title="Try component B",
            summary="Apply component B.",
            status="running",
        )

    with pytest.raises(ValueError, match="invalid hypothesis status"):
        repos.hypotheses.update(
            hypothesis_id="H1",
            status="completed",
        )

    with pytest.raises(ValueError, match="invalid evaluation status"):
        repos.evaluations.create(
            evaluation_id="EV3",
            project_id="P1",
            created_in_session_id="S1",
            title="Bad evaluation",
            summary="This should fail.",
            associated_baseline_id="B1",
            status="running",
        )

    with pytest.raises(ValueError, match="invalid baseline status"):
        repos.baselines.create(
            baseline_id="B2",
            project_id="P1",
            created_in_session_id="S1",
            title="Bad baseline",
            summary="This should fail.",
            status="running",
        )

    with pytest.raises(ValueError, match="exactly one measured subject"):
        repos.evaluations.create(
            evaluation_id="EV4",
            project_id="P1",
            created_in_session_id="S1",
            title="No subject",
            summary="This should fail.",
        )

    with pytest.raises(ValueError, match="invalid analysis status"):
        repos.analyses.create(
            analysis_id="A2",
            project_id="P1",
            created_in_session_id="S1",
            title="Bad analysis",
            summary="This should fail.",
            content="Bad status.",
            status="running",
        )


def test_core_repositories_reject_invalid_statuses(repos: Repositories) -> None:
    create_project(repos)

    with pytest.raises(ValueError, match="invalid project status"):
        repos.projects.update(
            project_id="P1",
            status="completed",
        )

    with pytest.raises(ValueError, match="invalid session status"):
        repos.sessions.update_status(
            session_id="S1",
            status="completed",
        )


def test_experiments_repository_accepts_work_status_enum(
    repos: Repositories,
) -> None:
    from situ.harness.records import WorkStatus

    create_hypothesis(repos)
    experiment = repos.experiments.create(
        experiment_id="EX2",
        project_id="P1",
        created_in_session_id="S1",
        title="Try component B",
        summary="Apply component B.",
        status=WorkStatus.ACTIVE,
    )

    updated = repos.experiments.update(
        experiment_id="EX2",
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
        hypothesis_id="H1",
        experiment_id="EX1",
    )

    assert link.hypothesis_id == "H1"
    assert link.experiment_id == "EX1"
    assert repos.hypothesis_experiment_links.get(
        hypothesis_id="H1",
        experiment_id="EX1",
    ) == link
    assert repos.hypothesis_experiment_links.list_for_hypothesis(hypothesis_id="H1") == [link]
    assert repos.hypothesis_experiment_links.list_for_experiment(experiment_id="EX1") == [
        link
    ]


def test_hypothesis_activities_repository_add_and_list(repos: Repositories) -> None:
    create_hypothesis(repos)

    activity = repos.hypothesis_activities.add(
        hypothesis_id="H1",
        created_in_session_id="S1",
        actor="agent",
        kind="comment",
        body="A looks worth trying.",
        payload={"experiment_id": "EX1"},
    )

    assert activity.id == 1
    assert activity.created_in_session_id == "S1"
    assert activity.payload == {"experiment_id": "EX1"}
    assert repos.hypothesis_activities.list_for_hypothesis(hypothesis_id="H1") == [activity]
    assert repos.hypothesis_activities.list_for_project(project_id="P1") == [activity]


def test_experiment_activities_repository_add_and_list(repos: Repositories) -> None:
    create_experiment(repos)

    activity = repos.experiment_activities.add(
        experiment_id="EX1",
        created_in_session_id="S1",
        actor="worker",
        kind="comment",
        body="A improved score.",
        payload={
            "activity_type": "result",
            "signals": [{"key": "score", "value": 0.73}],
        },
    )

    assert activity.id == 1
    assert activity.created_in_session_id == "S1"
    assert activity.kind == "comment"
    assert repos.experiment_activities.list_for_experiment(experiment_id="EX1") == [
        activity
    ]
    assert repos.experiment_activities.list_for_project(project_id="P1") == [activity]


def test_evaluation_activities_repository_add_and_list(repos: Repositories) -> None:
    create_evaluation(repos)

    activity = repos.evaluation_activities.add(
        evaluation_id="EV1",
        created_in_session_id="S1",
        actor="agent",
        kind="result",
        body="Baseline result recorded.",
        payload={
            "activity_type": "result",
            "signals": [{"key": "score", "value": 0.71}],
        },
    )

    assert activity.id == 1
    assert activity.created_in_session_id == "S1"
    assert activity.kind == "result"
    assert repos.evaluation_activities.list_for_evaluation(
        evaluation_id="EV1"
    ) == [activity]
    assert repos.evaluation_activities.list_for_project(project_id="P1") == [activity]

    with pytest.raises(ValueError, match="invalid evaluation activity kind"):
        repos.evaluation_activities.add(
            evaluation_id="EV1",
            created_in_session_id="S1",
            actor="agent",
            kind="comment",
            body="Evaluation discussion belongs in a result body for now.",
        )


def test_measurements_repository_add_and_list(repos: Repositories) -> None:
    measurement = create_measurement(repos)

    assert measurement.id == 1
    assert measurement.evaluation_id == "EV1"
    assert measurement.created_in_session_id == "S1"
    assert measurement.actor == "agent"
    assert measurement.payload.metrics["score"].value == 0.71
    assert measurement.model_dump()["payload"] == {
        "metrics": {"score": {"value": 0.71}}
    }
    assert repos.measurements.list_for_evaluation(evaluation_id="EV1") == [
        measurement
    ]
    assert repos.measurements.list_for_baseline(baseline_id="B1") == [
        measurement
    ]
    assert repos.measurements.list_for_project(project_id="P1") == [measurement]
    assert repos.measurements.list_for_session(session_id="S1") == [measurement]


def test_analysis_activities_repository_add_and_list(repos: Repositories) -> None:
    create_analysis(repos)

    activity = repos.analysis_activities.add(
        analysis_id="A1",
        created_in_session_id="S1",
        actor="agent",
        kind="comment",
        body="This map is ready for hypothesis generation.",
        payload={"source": "initial scan"},
    )

    assert activity.id == 1
    assert activity.created_in_session_id == "S1"
    assert activity.kind == "comment"
    assert activity.payload == {"source": "initial scan"}
    assert repos.analysis_activities.list_for_analysis(analysis_id="A1") == [activity]
    assert repos.analysis_activities.list_for_project(project_id="P1") == [activity]


def test_artifacts_repository_create_and_list(repos: Repositories) -> None:
    create_experiment(repos)
    activity = repos.experiment_activities.add(
        experiment_id="EX1",
        actor="worker",
        kind="comment",
        body="A improved score.",
    )

    artifact = repos.artifacts.create(
        artifact_id="ART1",
        project_id="P1",
        created_in_session_id="S1",
        associated_entity_kind="experiment_activity",
        associated_entity_id=str(activity.id),
        kind="json",
        title="raw eval output",
        path="artifacts/raw.json",
        media_type="application/json",
        size_bytes=120,
    )

    assert artifact.id == "ART1"
    assert artifact.project_id == "P1"
    assert artifact.created_in_session_id == "S1"
    assert artifact.associated_entity_kind == "experiment_activity"
    assert artifact.associated_entity_id == str(activity.id)
    assert repos.artifacts.get(artifact_id="ART1") == artifact
    assert repos.artifacts.list_for_project(project_id="P1") == [artifact]
    assert repos.artifacts.list_for_session(session_id="S1") == [artifact]


def test_events_repository_add_and_list(repos: Repositories) -> None:
    create_session(repos)

    event = repos.events.add(
        event_type="session.started",
        message="Started S1",
        session_id="S1",
        payload={"session_id": "S1"},
    )

    assert event.id == 1
    assert event.type == "session.started"
    assert event.associated_project_id == "P1"
    assert event.associated_session_id == "S1"
    assert event.payload == {"session_id": "S1"}
    assert repos.events.list_for_session(session_id="S1") == [event]
    assert repos.events.list_for_project(project_id="P1") == [event]
    assert repos.events.list_all() == [event]


def test_agent_message_history_repository_appends_and_reconstructs(
    repos: Repositories,
) -> None:
    create_session(repos)
    manager = repos.agents.ensure_session_agent(
        session_id="S1",
        kind="manager",
        display_name="Manager",
    )
    scientist = repos.agents.ensure_session_agent(
        session_id="S1",
        kind="scientist",
        display_name="Scientist",
    )

    first = repos.agent_message_history.append_session_messages(
        session_id="S1",
        agent_id=manager.id,
        agent_name="situ-research-planner",
        messages_json=(
            b'[{"kind":"request","run_id":"pydantic_run_1",'
            b'"conversation_id":"conversation_1"}]'
        ),
    )
    second = repos.agent_message_history.append_session_messages(
        session_id="S1",
        agent_id=scientist.id,
        agent_name="situ-research-planner",
        messages_json='[{"kind":"response","run_id":"pydantic_run_1","conversation_id":"conversation_1"}]',
    )

    assert first.id == 1
    assert first.pydantic_run_id == "pydantic_run_1"
    assert first.conversation_id == "conversation_1"
    assert second.id == 2
    assert repos.agent_message_history.get_message_history(
        project_or_session_id="S1",
        agent_id=manager.id,
    ) == [
        {"kind": "request", "run_id": "pydantic_run_1", "conversation_id": "conversation_1"},
    ]
    assert repos.agent_message_history.get_message_history(
        project_or_session_id="S1",
        agent_name="situ-research-planner",
    ) == [
        {"kind": "request", "run_id": "pydantic_run_1", "conversation_id": "conversation_1"},
        {"kind": "response", "run_id": "pydantic_run_1", "conversation_id": "conversation_1"},
    ]


def test_current_state_api_composes_protocol_shaped_state(repos: Repositories) -> None:
    create_experiment(repos)
    analysis = create_analysis(repos)
    repos.hypothesis_experiment_links.create(
        hypothesis_id="H1",
        experiment_id="EX1",
    )
    repos.experiment_activities.add(
        experiment_id="EX1",
        actor="worker",
        kind="comment",
        body="A improved score.",
        payload={
            "activity_type": "result",
            "signals": [{"key": "score", "value": 0.73}],
        },
    )
    repos.analysis_activities.add(
        analysis_id=analysis.id,
        created_in_session_id="S1",
        actor="agent",
        kind="comment",
        body="Mapped the codebase.",
    )
    baseline = create_baseline(repos)
    repos.evaluations.create(
        evaluation_id="EV1",
        project_id="P1",
        created_in_session_id="S1",
        title="Baseline project eval",
        summary="Run the baseline project evaluation.",
        associated_baseline_id=baseline.id,
    )
    repos.measurements.add(
        evaluation_id="EV1",
        created_in_session_id="S1",
        actor="agent",
        body="Baseline result recorded.",
        payload={"activity_type": "result"},
    )
    repos.evaluation_activities.add(
        evaluation_id="EV1",
        created_in_session_id="S1",
        actor="agent",
        kind="result",
        body="Baseline result recorded.",
        payload={"activity_type": "result"},
    )
    repos.events.add(
        event_type="experiment.completed",
        message="Completed EX1",
        session_id="S1",
        payload={"experiment_id": "EX1"},
    )

    current_state = CurrentStateService(repos=repos).get()
    assert current_state.workspace is not None
    assert current_state.workspace.id == "workspace_test"
    assert [project.id for project in current_state.projects] == ["P1"]
    assert [session.id for session in current_state.sessions] == ["S1"]
    assert [hypothesis.id for hypothesis in current_state.hypotheses] == ["H1"]
    assert [baseline.id for baseline in current_state.baselines] == [
        "B1"
    ]
    assert [experiment.id for experiment in current_state.experiments] == [
        "EX1"
    ]
    assert [evaluation.id for evaluation in current_state.evaluations] == [
        "EV1"
    ]
    assert [analysis.id for analysis in current_state.analyses] == ["A1"]
    assert [measurement.id for measurement in current_state.measurements] == [1]
    assert [activity.kind for activity in current_state.analysis_activities] == [
        "comment"
    ]
    assert [activity.kind for activity in current_state.experiment_activities] == [
        "comment"
    ]
    assert [activity.kind for activity in current_state.evaluation_activities] == [
        "result"
    ]
    assert [event.type for event in current_state.events] == ["experiment.completed"]


def test_project_board_api_composes_project_board(repos: Repositories) -> None:
    create_experiment(repos)
    analysis = create_analysis(repos)
    repos.hypothesis_experiment_links.create(
        hypothesis_id="H1",
        experiment_id="EX1",
    )
    repos.hypothesis_activities.add(
        hypothesis_id="H1",
        actor="agent",
        kind="comment",
        body="A is active.",
    )
    repos.analysis_activities.add(
        analysis_id=analysis.id,
        created_in_session_id="S1",
        actor="agent",
        kind="comment",
        body="Mapped the codebase.",
    )
    repos.experiment_activities.add(
        experiment_id="EX1",
        actor="worker",
        kind="comment",
        body="A improved score.",
    )
    baseline = create_baseline(repos)
    repos.evaluations.create(
        evaluation_id="EV1",
        project_id="P1",
        created_in_session_id="S1",
        title="Baseline project eval",
        summary="Run the baseline project evaluation.",
        associated_baseline_id=baseline.id,
    )
    repos.measurements.add(
        evaluation_id="EV1",
        created_in_session_id="S1",
        actor="agent",
        body="Baseline result recorded.",
    )
    repos.evaluation_activities.add(
        evaluation_id="EV1",
        created_in_session_id="S1",
        actor="agent",
        kind="result",
        body="Baseline result recorded.",
    )

    graph = ProjectBoardService(repos=repos).get_project_board(
        session_id="S1"
    )

    assert graph.workspace is not None
    assert graph.workspace.id == "workspace_test"
    assert graph.project is not None
    assert graph.project.id == "P1"
    assert graph.session is not None
    assert graph.session.id == "S1"
    assert [hypothesis.id for hypothesis in graph.hypotheses] == ["H1"]
    assert [baseline.id for baseline in graph.baselines] == [
        "B1"
    ]
    assert [experiment.id for experiment in graph.experiments] == [
        "EX1"
    ]
    assert [evaluation.id for evaluation in graph.evaluations] == [
        "EV1"
    ]
    assert [analysis.id for analysis in graph.analyses] == ["A1"]
    assert [measurement.id for measurement in graph.measurements] == [1]
    assert [activity.kind for activity in graph.analysis_activities] == ["comment"]
    assert [activity.kind for activity in graph.experiment_activities] == [
        "comment"
    ]
    assert [activity.kind for activity in graph.evaluation_activities] == [
        "result"
    ]
