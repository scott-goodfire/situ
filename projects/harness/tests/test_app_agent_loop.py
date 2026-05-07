from __future__ import annotations

import subprocess
from pathlib import Path
from typing import Any

import pytest

from situ.harness.agents import ResearchAgentOutput
from situ.harness.app import HarnessApp, MANAGER_NO_PROGRESS_LIMIT
from situ.harness.records import TaskEntityKind, TaskKind, TaskStatus


def test_session_loop_replans_after_baseline_before_closing(
    tmp_path: Path,
    monkeypatch,
) -> None:
    app, session_id, project_id = _app_with_initial_plan(tmp_path)
    runtime = BaselineThenExperimentRuntime()
    monkeypatch.setattr("situ.harness.app.AgentRuntime", lambda _project_dir: runtime)

    app._execute_session(session_id, max_experiments=1)

    session = app.repos.sessions.get(session_id=session_id)
    tasks = app.repos.tasks.list_for_session(session_id=session_id)
    experiments = app.repos.experiments.list_for_session(session_id=session_id)

    assert session is not None
    assert session.status == "closed"
    assert runtime.plan_calls == 2
    assert runtime.critic_calls == 1
    assert runtime.scientist_task_kinds == ["baseline", "experiment"]
    assert runtime.scientist_repo_paths[0] != runtime.scientist_repo_paths[1]
    assert runtime.scientist_repo_paths[1] is not None
    assert Path(runtime.scientist_repo_paths[1]).is_dir()
    workspace = app.repos.workspaces.get()
    assert workspace is not None
    assert (Path(workspace.repo_path) / "README.md").read_text() == "test workspace\n"
    assert (
        Path(runtime.scientist_repo_paths[1]) / "README.md"
    ).read_text() == "candidate workspace\n"
    assert [experiment.title for experiment in experiments] == ["Try candidate"]
    assert {
        task.title: task.status for task in tasks if task.kind != TaskKind.PLAN
    } == {
        "Establish baseline": TaskStatus.DONE,
        "Try candidate": TaskStatus.DONE,
        "Review Try candidate": TaskStatus.DONE,
    }
    review_activities = [
        activity
        for experiment in experiments
        for activity in app.repos.experiment_activities.list_for_experiment(
            experiment_id=experiment.id
        )
        if activity.payload.get("activity_type") == "critic_review"
    ]
    assert len(review_activities) == 1
    assert review_activities[0].payload["verdict"] == "usable"
    assert any(
        event.type == "session.completed"
        and "experiment budget" in event.message.lower()
        and event.associated_project_id == project_id
        for event in app.repos.events.list_for_session(session_id=session_id)
    )


def test_baseline_only_work_does_not_create_critic_review(
    tmp_path: Path,
    monkeypatch,
) -> None:
    app, session_id, _project_id = _app_with_initial_plan(tmp_path)
    runtime = BaselineOnlyRuntime()
    monkeypatch.setattr("situ.harness.app.AgentRuntime", lambda _project_dir: runtime)

    app._execute_session(session_id, max_experiments=1)

    tasks = app.repos.tasks.list_for_session(session_id=session_id)

    assert runtime.critic_calls == 0
    assert not [task for task in tasks if task.kind == TaskKind.REVIEW]
    assert any(task.kind == TaskKind.BASELINE for task in tasks)


def test_experiment_review_task_links_evaluations_and_measurements(
    tmp_path: Path,
) -> None:
    app, session_id, project_id = _app_with_initial_plan(tmp_path)
    experiment_id, evaluation_id, measurement_id = (
        _seed_closed_experiment_with_measurement(app, session_id, project_id)
    )

    task = app._enqueue_experiment_review_task(
        session_id=session_id,
        project_id=project_id,
        experiment_id=experiment_id,
        source_task_id="T999",
    )

    links = app.repos.task_entity_links.list_for_task(task_id=task.id)
    linked = {(link.entity_kind, link.entity_id) for link in links}

    assert task.payload["evaluation_ids"] == [evaluation_id]
    assert task.payload["measurement_ids"] == [measurement_id]
    assert (TaskEntityKind.EXPERIMENT, experiment_id) in linked
    assert (TaskEntityKind.EVALUATION, evaluation_id) in linked
    assert (TaskEntityKind.MEASUREMENT, str(measurement_id)) in linked


def test_experiment_review_task_is_not_duplicated_for_same_experiment(
    tmp_path: Path,
) -> None:
    app, session_id, project_id = _app_with_initial_plan(tmp_path)
    experiment_id, _evaluation_id, _measurement_id = (
        _seed_closed_experiment_with_measurement(app, session_id, project_id)
    )

    first = app._enqueue_experiment_review_task(
        session_id=session_id,
        project_id=project_id,
        experiment_id=experiment_id,
        source_task_id="T999",
    )
    second = app._enqueue_experiment_review_task(
        session_id=session_id,
        project_id=project_id,
        experiment_id=experiment_id,
        source_task_id="T999",
    )

    review_tasks = [
        task
        for task in app.repos.tasks.list_for_session(session_id=session_id)
        if task.kind == TaskKind.REVIEW
        and task.payload.get("experiment_id") == experiment_id
    ]

    assert second.id == first.id
    assert len(review_tasks) == 1


def test_default_session_start_creates_fresh_project_per_session(
    tmp_path: Path,
    monkeypatch,
) -> None:
    workspace = tmp_path / "workspace"
    workspace.mkdir()
    app = HarnessApp(
        workspace,
        app_root=Path.cwd(),
        project_home=tmp_path / "home",
        notify=lambda _method, _params: None,
    )
    monkeypatch.setattr(app, "_start_session_thread", lambda **_kwargs: None)

    first = app.session_start(
        {
            "objective": "Improve score",
            "research_context": "Run local evals.",
            "max_experiments": 1,
        }
    )
    second = app.session_start(
        {
            "objective": "Improve score again",
            "research_context": "Run local evals again.",
            "max_experiments": 1,
        }
    )

    sessions = app.repos.sessions.list_all()
    projects = app.repos.projects.list_all()
    started_events = [
        event for event in app.repos.events.list_all() if event.type == "session.started"
    ]

    assert [first["session_id"], second["session_id"]] == [
        "S1",
        "S2",
    ]
    assert len(projects) == 2
    assert len(sessions) == 2
    assert [session.project_id for session in sessions] == [
        project.id for project in projects
    ]
    assert all(session.project_id is not None for session in sessions)
    assert [project.title for project in projects] == ["workspace", "workspace"]
    assert [project.objective for project in projects] == [
        "Improve score",
        "Improve score again",
    ]
    assert [event.associated_session_id for event in started_events] == [
        "S1",
        "S2",
    ]
    assert [event.associated_project_id for event in started_events] == [
        projects[0].id,
        projects[1].id,
    ]


def test_session_start_refuses_dirty_git_workspace_before_creating_records(
    tmp_path: Path,
    monkeypatch,
) -> None:
    workspace = tmp_path / "workspace"
    workspace.mkdir()
    _git(workspace, "init")
    (workspace / "dirty.txt").write_text("dirty\n")
    app = HarnessApp(
        workspace,
        app_root=Path.cwd(),
        project_home=tmp_path / "home",
        notify=lambda _method, _params: None,
    )
    monkeypatch.setattr(
        app,
        "_start_session_thread",
        lambda **_kwargs: pytest.fail("session thread should not start"),
    )

    with pytest.raises(
        RuntimeError,
        match="workspace must be clean before starting a Situ session",
    ):
        app.session_start(
            {
                "objective": "Improve score",
                "research_context": "Run local evals.",
                "max_experiments": 1,
            }
        )

    assert app.repos.projects.list_all() == []
    assert app.repos.sessions.list_all() == []
    assert not [
        event for event in app.repos.events.list_all() if event.type == "session.started"
    ]


def test_session_loop_retries_manager_before_no_progress_close(
    tmp_path: Path,
    monkeypatch,
) -> None:
    app, session_id, _project_id = _app_with_initial_plan(tmp_path)
    runtime = NoProgressRuntime()
    monkeypatch.setattr("situ.harness.app.AgentRuntime", lambda _project_dir: runtime)

    app._execute_session(session_id, max_experiments=1)

    session = app.repos.sessions.get(session_id=session_id)
    tasks = app.repos.tasks.list_for_session(session_id=session_id)

    assert session is not None
    assert session.status == "closed"
    assert runtime.plan_calls == MANAGER_NO_PROGRESS_LIMIT
    assert runtime.scientist_calls == 0
    assert [task.kind for task in tasks] == [TaskKind.PLAN] * MANAGER_NO_PROGRESS_LIMIT
    assert all(task.status == TaskStatus.DONE for task in tasks)
    assert any(
        event.type == "session.completed"
        and "no runnable researcher, scientist, or critic task"
        in event.message.lower()
        for event in app.repos.events.list_for_session(session_id=session_id)
    )


def test_session_loop_closes_immediately_when_project_is_closed_by_manager(
    tmp_path: Path,
    monkeypatch,
) -> None:
    app, session_id, project_id = _app_with_initial_plan(tmp_path)
    runtime = CloseProjectRuntime()
    monkeypatch.setattr("situ.harness.app.AgentRuntime", lambda _project_dir: runtime)

    app._execute_session(session_id, max_experiments=10)

    session = app.repos.sessions.get(session_id=session_id)
    tasks = app.repos.tasks.list_for_session(session_id=session_id)

    assert session is not None
    assert session.status == "closed"
    assert runtime.plan_calls == 1
    assert runtime.scientist_calls == 0
    assert [task.kind for task in tasks] == [TaskKind.PLAN]
    assert any(
        event.type == "session.completed"
        and "manager confirmation" in event.message.lower()
        and event.associated_project_id == project_id
        for event in app.repos.events.list_for_session(session_id=session_id)
    )


def test_session_loop_runs_researcher_tasks_before_scientist_work(
    tmp_path: Path,
    monkeypatch,
) -> None:
    app, session_id, _project_id = _app_with_initial_plan(tmp_path)
    runtime = ResearcherThenNoProgressRuntime()
    monkeypatch.setattr("situ.harness.app.AgentRuntime", lambda _project_dir: runtime)

    app._execute_session(session_id, max_experiments=1)

    tasks = app.repos.tasks.list_for_session(session_id=session_id)
    analyses = app.repos.analyses.list_for_session(session_id=session_id)

    assert runtime.researcher_calls == 1
    assert runtime.scientist_calls == 0
    assert [analysis.title for analysis in analyses] == ["Codebase knobs"]
    assert any(task.kind == TaskKind.RESEARCH and task.status == TaskStatus.DONE for task in tasks)
    assert any(
        event.type == "session.researcher_completed"
        for event in app.repos.events.list_for_session(session_id=session_id)
    )


def test_failed_experiment_task_still_records_worktree_state(
    tmp_path: Path,
    monkeypatch,
) -> None:
    app, session_id, _project_id = _app_with_initial_plan(tmp_path)
    runtime = FailingExperimentRuntime()
    monkeypatch.setattr("situ.harness.app.AgentRuntime", lambda _project_dir: runtime)

    app._execute_session(session_id, max_experiments=1)

    session = app.repos.sessions.get(session_id=session_id)
    tasks = app.repos.tasks.list_for_session(session_id=session_id)
    experiments = app.repos.experiments.list_for_session(session_id=session_id)

    assert session is not None
    assert session.status == "closed"
    assert experiments
    assert tasks[-1].status == TaskStatus.FAILED
    assert runtime.scientist_repo_path is not None
    activities = app.repos.experiment_activities.list_for_experiment(experiment_id=experiments[0].id)
    assert activities[-1].payload["activity_type"] == "workspace_state"
    assert activities[-1].payload["worktree"]["dirty"] is True
    assert activities[-1].payload["worktree"]["changes"] == [
        {"status": " M", "path": "README.md"}
    ]
    assert any(
        event.type == "session.failed"
        for event in app.repos.events.list_for_session(session_id=session_id)
    )


class BaselineThenExperimentRuntime:
    def __init__(self) -> None:
        self.plan_calls = 0
        self.critic_calls = 0
        self.scientist_task_kinds: list[str] = []
        self.scientist_repo_paths: list[str | None] = []

    def plan_session(self, **kwargs: Any) -> ResearchAgentOutput:
        self.plan_calls += 1
        repos = kwargs["repos"]
        session_id = kwargs["session_id"]
        project_id = repos.sessions.get(session_id=session_id).project_id
        assert project_id is not None

        if self.plan_calls == 1:
            repos.tasks.create(
                task_id=repos.tasks.next_id(project_id=project_id),
                project_id=project_id,
                created_in_session_id=session_id,
                title="Establish baseline",
                content="Run the baseline measurement.",
                kind=TaskKind.BASELINE,
                priority="high",
                source_kind="manager",
            )
            return ResearchAgentOutput(summary="filed baseline")

        repos.tasks.create(
            task_id=repos.tasks.next_id(project_id=project_id),
            project_id=project_id,
            created_in_session_id=session_id,
            title="Try candidate",
            content="Run one candidate experiment.",
            kind=TaskKind.EXPERIMENT,
            priority="high",
            source_kind="manager",
        )
        return ResearchAgentOutput(summary="filed experiment")

    def run_session(self, **kwargs: Any) -> ResearchAgentOutput:
        repos = kwargs["repos"]
        session_id = kwargs["session_id"]
        assigned_task_ids = kwargs["assigned_task_ids"]
        task = repos.tasks.get(task_id=assigned_task_ids[0])
        assert task is not None
        project_id = repos.sessions.get(session_id=session_id).project_id
        assert project_id is not None

        self.scientist_task_kinds.append(task.kind.value)
        self.scientist_repo_paths.append(kwargs.get("repo_path"))
        if task.kind == "baseline":
            baseline = repos.baselines.create(
                baseline_id="B1",
                project_id=project_id,
                created_in_session_id=session_id,
                title="Baseline",
                summary="Reference behavior.",
                status="closed",
            )
            evaluation = repos.evaluations.create(
                evaluation_id="EV1",
                project_id=project_id,
                created_in_session_id=session_id,
                title="Baseline",
                summary="Baseline evidence.",
                associated_baseline_id=baseline.id,
                status="closed",
            )
            repos.measurements.add(
                evaluation_id=evaluation.id,
                created_in_session_id=session_id,
                actor="agent",
                body="baseline result",
            )
            repos.evaluation_activities.add(
                evaluation_id=evaluation.id,
                created_in_session_id=session_id,
                actor="agent",
                kind="result",
                body="baseline result",
            )
            return ResearchAgentOutput(summary="baseline done")

        experiment_id = task.payload["experiment_id"]
        repo_path = kwargs["repo_path"]
        assert repo_path is not None
        (Path(repo_path) / "README.md").write_text("candidate workspace\n")
        repos.experiments.update(
            experiment_id=experiment_id,
            title="Try candidate",
            summary="Candidate result.",
            status="closed",
        )
        return ResearchAgentOutput(summary="experiment done")

    def run_review(self, **kwargs: Any) -> ResearchAgentOutput:
        self.critic_calls += 1
        repos = kwargs["repos"]
        task = repos.tasks.get(task_id=kwargs["assigned_task_ids"][0])
        assert task is not None
        experiment_id = task.payload["experiment_id"]
        repos.experiment_activities.add(
            experiment_id=experiment_id,
            created_in_session_id=kwargs["session_id"],
            actor="critic",
            kind="comment",
            body="Candidate evidence is usable.",
            payload={
                "activity_type": "critic_review",
                "verdict": "usable",
                "recommended_next_step": "accept",
            },
        )
        return ResearchAgentOutput(summary="review done")


class BaselineOnlyRuntime:
    def __init__(self) -> None:
        self.plan_calls = 0
        self.critic_calls = 0

    def plan_session(self, **kwargs: Any) -> ResearchAgentOutput:
        self.plan_calls += 1
        repos = kwargs["repos"]
        session_id = kwargs["session_id"]
        project_id = repos.sessions.get(session_id=session_id).project_id
        assert project_id is not None
        if self.plan_calls == 1:
            repos.tasks.create(
                task_id=repos.tasks.next_id(project_id=project_id),
                project_id=project_id,
                created_in_session_id=session_id,
                title="Establish baseline only",
                content="Run the baseline measurement.",
                kind=TaskKind.BASELINE,
                priority="high",
                source_kind="manager",
            )
        return ResearchAgentOutput(summary="baseline plan")

    def run_session(self, **kwargs: Any) -> ResearchAgentOutput:
        repos = kwargs["repos"]
        session_id = kwargs["session_id"]
        project_id = repos.sessions.get(session_id=session_id).project_id
        assert project_id is not None
        baseline = repos.baselines.create(
            baseline_id="B1",
            project_id=project_id,
            created_in_session_id=session_id,
            title="Baseline",
            summary="Reference behavior.",
            status="closed",
        )
        evaluation = repos.evaluations.create(
            evaluation_id="EV1",
            project_id=project_id,
            created_in_session_id=session_id,
            title="Baseline",
            summary="Baseline evidence.",
            associated_baseline_id=baseline.id,
            status="closed",
        )
        repos.measurements.add(
            evaluation_id=evaluation.id,
            created_in_session_id=session_id,
            actor="agent",
            body="baseline result",
        )
        return ResearchAgentOutput(summary="baseline done")

    def run_review(self, **_kwargs: Any) -> ResearchAgentOutput:
        self.critic_calls += 1
        return ResearchAgentOutput(summary="should not review baseline")


class NoProgressRuntime:
    def __init__(self) -> None:
        self.plan_calls = 0
        self.scientist_calls = 0

    def plan_session(self, **_kwargs: Any) -> ResearchAgentOutput:
        self.plan_calls += 1
        return ResearchAgentOutput(summary="no runnable task filed")

    def run_session(self, **_kwargs: Any) -> ResearchAgentOutput:
        self.scientist_calls += 1
        return ResearchAgentOutput(summary="should not run")


class CloseProjectRuntime:
    def __init__(self) -> None:
        self.plan_calls = 0
        self.scientist_calls = 0

    def plan_session(self, **kwargs: Any) -> ResearchAgentOutput:
        self.plan_calls += 1
        repos = kwargs["repos"]
        session_id = kwargs["session_id"]
        project_id = repos.sessions.get(session_id=session_id).project_id
        assert project_id is not None
        repos.projects.update(project_id=project_id, status="closed")
        return ResearchAgentOutput(summary="confirmed close")

    def run_session(self, **_kwargs: Any) -> ResearchAgentOutput:
        self.scientist_calls += 1
        return ResearchAgentOutput(summary="should not run")


class ResearcherThenNoProgressRuntime:
    def __init__(self) -> None:
        self.plan_calls = 0
        self.researcher_calls = 0
        self.scientist_calls = 0

    def plan_session(self, **kwargs: Any) -> ResearchAgentOutput:
        self.plan_calls += 1
        repos = kwargs["repos"]
        session_id = kwargs["session_id"]
        project_id = repos.sessions.get(session_id=session_id).project_id
        assert project_id is not None
        if self.plan_calls == 1:
            repos.tasks.create(
                task_id=repos.tasks.next_id(project_id=project_id),
                project_id=project_id,
                created_in_session_id=session_id,
                title="Research codebase knobs",
                content="Create an analysis of likely codebase knobs.",
                kind=TaskKind.RESEARCH,
                priority="high",
                source_kind="manager",
            )
            return ResearchAgentOutput(summary="filed research")
        return ResearchAgentOutput(summary="no runnable task filed")

    def run_research(self, **kwargs: Any) -> ResearchAgentOutput:
        self.researcher_calls += 1
        repos = kwargs["repos"]
        session_id = kwargs["session_id"]
        project_id = repos.sessions.get(session_id=session_id).project_id
        assert project_id is not None
        repos.analyses.create(
            analysis_id="A1",
            project_id=project_id,
            created_in_session_id=session_id,
            status="open",
            title="Codebase knobs",
            summary="The main knobs are scoring weights.",
            content="Tune scoring weights before trying broader changes.",
        )
        return ResearchAgentOutput(summary="research done")

    def run_session(self, **_kwargs: Any) -> ResearchAgentOutput:
        self.scientist_calls += 1
        return ResearchAgentOutput(summary="should not run")


class FailingExperimentRuntime:
    def __init__(self) -> None:
        self.plan_calls = 0
        self.scientist_repo_path: str | None = None

    def plan_session(self, **kwargs: Any) -> ResearchAgentOutput:
        self.plan_calls += 1
        repos = kwargs["repos"]
        session_id = kwargs["session_id"]
        project_id = repos.sessions.get(session_id=session_id).project_id
        assert project_id is not None
        repos.tasks.create(
            task_id=repos.tasks.next_id(project_id=project_id),
            project_id=project_id,
            created_in_session_id=session_id,
            title="Try candidate",
            content="Run one candidate experiment.",
            kind=TaskKind.EXPERIMENT,
            priority="high",
            source_kind="manager",
        )
        return ResearchAgentOutput(summary="filed experiment")

    def run_session(self, **kwargs: Any) -> ResearchAgentOutput:
        repo_path = kwargs["repo_path"]
        assert repo_path is not None
        self.scientist_repo_path = repo_path
        (Path(repo_path) / "README.md").write_text("partial candidate\n")
        raise RuntimeError("candidate crashed")


def _app_with_initial_plan(tmp_path: Path) -> tuple[HarnessApp, str, str]:
    workspace = tmp_path / "workspace"
    workspace.mkdir()
    _git(workspace, "init")
    (workspace / "README.md").write_text("test workspace\n")
    _git(workspace, "add", ".")
    _commit(workspace, "initial")
    app = HarnessApp(
        workspace,
        app_root=Path.cwd(),
        project_home=tmp_path / "home",
        notify=lambda _method, _params: None,
    )
    workspace_record = app.repos.workspaces.ensure()
    project = app.repos.projects.create(
        project_id="P1",
        workspace_id=workspace_record.id,
        title="Improve score",
        objective="Improve score.",
        research_context="Run local evals.",
    )
    session = app.repos.sessions.create(
        session_id="S1",
        workspace_id=workspace_record.id,
        project_id=project.id,
    )
    app._session_setup[session.id] = {
        "objective": project.objective,
        "research_context": project.research_context,
    }
    app._ensure_project_agents(session_id=session.id, project_id=project.id)
    app._enqueue_plan_task(
        session_id=session.id,
        project_id=project.id,
        title="Plan first pass",
        content="File first Scientist work.",
        source_kind="system",
    )
    return app, session.id, project.id


def _seed_closed_experiment_with_measurement(
    app: HarnessApp,
    session_id: str,
    project_id: str,
) -> tuple[str, str, int]:
    workspace = app.repos.workspaces.get()
    assert workspace is not None
    experiment = app.repos.experiments.create(
        experiment_id="EX1",
        project_id=project_id,
        created_in_session_id=session_id,
        title="Try candidate",
        summary="Candidate result.",
        status="closed",
        worktree_path=workspace.repo_path,
        base_commit="test-base",
    )
    evaluation = app.repos.evaluations.create(
        evaluation_id="EV1",
        project_id=project_id,
        created_in_session_id=session_id,
        title="Candidate eval",
        summary="Candidate evidence.",
        associated_experiment_id=experiment.id,
        status="closed",
    )
    measurement = app.repos.measurements.add(
        evaluation_id=evaluation.id,
        created_in_session_id=session_id,
        actor="agent",
        body="candidate result",
    )
    app.repos.evaluation_activities.add(
        evaluation_id=evaluation.id,
        created_in_session_id=session_id,
        actor="agent",
        kind="result",
        body="candidate result",
        payload={"measurement_id": measurement.id},
    )
    return experiment.id, evaluation.id, measurement.id


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
