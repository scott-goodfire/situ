from __future__ import annotations

from pathlib import Path
from typing import Any

from situ.harness.agents import ResearchAgentOutput
from situ.harness.app import HarnessApp, MANAGER_NO_PROGRESS_LIMIT
from situ.harness.records import TaskKind, TaskStatus


def test_session_loop_replans_after_baseline_before_closing(
    tmp_path: Path,
    monkeypatch,
) -> None:
    app, session_id, project_id = _app_with_initial_plan(tmp_path)
    runtime = BaselineThenExperimentRuntime()
    monkeypatch.setattr("situ.harness.app.AgentRuntime", lambda _project_dir: runtime)

    app._execute_session(session_id, max_experiments=1)

    session = app.repos.sessions.get(session_id)
    tasks = app.repos.tasks.list_for_session(session_id)
    experiments = app.repos.experiments.list_for_session(session_id)

    assert session is not None
    assert session.status == "closed"
    assert runtime.plan_calls == 2
    assert runtime.scientist_task_kinds == ["baseline", "experiment"]
    assert [experiment.title for experiment in experiments] == ["Try candidate"]
    assert {
        task.title: task.status for task in tasks if task.kind != TaskKind.PLAN
    } == {
        "Establish baseline": TaskStatus.DONE,
        "Try candidate": TaskStatus.DONE,
    }
    assert any(
        event.type == "session.completed"
        and "experiment budget" in event.message.lower()
        and event.associated_project_id == project_id
        for event in app.repos.events.list_for_session(session_id)
    )


def test_session_loop_retries_manager_before_no_progress_close(
    tmp_path: Path,
    monkeypatch,
) -> None:
    app, session_id, _project_id = _app_with_initial_plan(tmp_path)
    runtime = NoProgressRuntime()
    monkeypatch.setattr("situ.harness.app.AgentRuntime", lambda _project_dir: runtime)

    app._execute_session(session_id, max_experiments=1)

    session = app.repos.sessions.get(session_id)
    tasks = app.repos.tasks.list_for_session(session_id)

    assert session is not None
    assert session.status == "closed"
    assert runtime.plan_calls == MANAGER_NO_PROGRESS_LIMIT
    assert runtime.scientist_calls == 0
    assert [task.kind for task in tasks] == [TaskKind.PLAN] * MANAGER_NO_PROGRESS_LIMIT
    assert all(task.status == TaskStatus.DONE for task in tasks)
    assert any(
        event.type == "session.completed"
        and "no runnable scientist task" in event.message.lower()
        for event in app.repos.events.list_for_session(session_id)
    )


class BaselineThenExperimentRuntime:
    def __init__(self) -> None:
        self.plan_calls = 0
        self.scientist_task_kinds: list[str] = []

    def plan_session(self, **kwargs: Any) -> ResearchAgentOutput:
        self.plan_calls += 1
        repos = kwargs["repos"]
        session_id = kwargs["session_id"]
        project_id = repos.sessions.get(session_id).project_id
        assert project_id is not None

        if self.plan_calls == 1:
            repos.tasks.create(
                task_id=repos.tasks.next_id(project_id),
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
            task_id=repos.tasks.next_id(project_id),
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
        task = kwargs["active_task"]
        project_id = repos.sessions.get(session_id).project_id
        assert project_id is not None

        self.scientist_task_kinds.append(task["kind"])
        if task["kind"] == "baseline":
            evaluation = repos.evaluations.create(
                evaluation_id="eval_baseline",
                project_id=project_id,
                created_in_session_id=session_id,
                title="Baseline",
                summary="Baseline evidence.",
                status="closed",
            )
            repos.evaluation_activities.add(
                evaluation_id=evaluation.id,
                created_in_session_id=session_id,
                actor="agent",
                kind="result",
                body="baseline result",
            )
            return ResearchAgentOutput(summary="baseline done")

        repos.experiments.create(
            experiment_id="exp_candidate",
            project_id=project_id,
            created_in_session_id=session_id,
            title="Try candidate",
            summary="Candidate result.",
            status="closed",
        )
        return ResearchAgentOutput(summary="experiment done")


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


def _app_with_initial_plan(tmp_path: Path) -> tuple[HarnessApp, str, str]:
    workspace = tmp_path / "workspace"
    workspace.mkdir()
    app = HarnessApp(
        workspace,
        app_root=Path.cwd(),
        project_home=tmp_path / "home",
        notify=lambda _method, _params: None,
    )
    workspace_record = app.repos.workspaces.ensure()
    project = app.repos.projects.create(
        project_id="project_0001",
        workspace_id=workspace_record.id,
        title="Improve score",
        objective="Improve score.",
        research_context="Run local evals.",
    )
    session = app.repos.sessions.create(
        "session_0001",
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
