from __future__ import annotations

import asyncio
import subprocess
from pathlib import Path
from typing import Any

import pytest

from situ.harness.agents import ResearchAgentOutput
from situ.harness.app import HarnessApp, MANAGER_NO_PROGRESS_LIMIT
from situ.harness.records import TaskEntityKind, TaskKind, TaskStatus, TaskWorkType

pytestmark = pytest.mark.asyncio


async def test_session_loop_replans_after_baseline_before_closing(
    tmp_path: Path,
    monkeypatch,
) -> None:
    app, session_id, project_id = await _app_with_initial_plan(tmp_path)
    runtime = BaselineThenExperimentRuntime()
    monkeypatch.setattr("situ.harness.app.AgentRuntime", lambda _project_dir: runtime)

    await app._execute_session_async(session_id=session_id, max_experiments=1)

    session = await app.repos.sessions.get(session_id=session_id)
    tasks = await app.repos.tasks.list_for_session(session_id=session_id)
    experiments = await app.repos.experiments.list_for_session(session_id=session_id)

    assert session is not None
    assert session.status == "closed"
    assert runtime.plan_calls == 2
    assert runtime.critic_calls == 1
    assert runtime.scientist_task_kinds == ["baseline", "experiment"]
    assert runtime.scientist_repo_paths[0] != runtime.scientist_repo_paths[1]
    assert runtime.scientist_repo_paths[1] is not None
    assert Path(runtime.scientist_repo_paths[1]).is_dir()
    workspace = await app.repos.workspaces.get()
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
    scientist_task_assignees = {
        task.assignee_id
        for task in tasks
        if task.kind in {TaskKind.BASELINE, TaskKind.EXPERIMENT}
    }
    assert len(scientist_task_assignees) == 2
    assert all(
        assignee_id is not None and "_scientist_" in assignee_id
        for assignee_id in scientist_task_assignees
    )
    review_activities = [
        activity
        for experiment in experiments
        for activity in await app.repos.experiment_activities.list_for_experiment(
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
        for event in await app.repos.events.list_for_session(session_id=session_id)
    )


async def test_session_setup_creates_only_persistent_manager_agent(tmp_path: Path) -> None:
    app, _session_id, project_id = await _app_with_initial_plan(tmp_path)

    agents = await app.repos.agents.list_for_project(project_id=project_id)

    assert [(agent.kind.value, agent.display_name) for agent in agents] == [
        ("manager", "Manager")
    ]


async def test_baseline_only_work_does_not_create_critic_review(
    tmp_path: Path,
    monkeypatch,
) -> None:
    app, session_id, _project_id = await _app_with_initial_plan(tmp_path)
    runtime = BaselineOnlyRuntime()
    monkeypatch.setattr("situ.harness.app.AgentRuntime", lambda _project_dir: runtime)

    await app._execute_session_async(session_id=session_id, max_experiments=1)

    tasks = await app.repos.tasks.list_for_session(session_id=session_id)

    assert runtime.critic_calls == 0
    assert not [task for task in tasks if task.kind == TaskKind.REVIEW]
    assert any(task.kind == TaskKind.BASELINE for task in tasks)


async def test_experiment_review_task_links_evaluations_and_measurements(
    tmp_path: Path,
) -> None:
    app, session_id, project_id = await _app_with_initial_plan(tmp_path)
    experiment_id, evaluation_id, measurement_id = (
        await _seed_closed_experiment_with_measurement(app, session_id, project_id)
    )

    task = await app._enqueue_experiment_review_task(
        session_id=session_id,
        project_id=project_id,
        experiment_id=experiment_id,
        source_task_id="T999",
    )

    links = await app.repos.task_entity_links.list_for_task(task_id=task.id)
    linked = {(link.entity_kind, link.entity_id) for link in links}

    assert task.payload["evaluation_ids"] == [evaluation_id]
    assert task.payload["measurement_ids"] == [measurement_id]
    assert (TaskEntityKind.EXPERIMENT, experiment_id) in linked
    assert (TaskEntityKind.EVALUATION, evaluation_id) in linked
    assert (TaskEntityKind.MEASUREMENT, measurement_id) in linked


async def test_experiment_review_task_is_not_duplicated_for_same_experiment(
    tmp_path: Path,
) -> None:
    app, session_id, project_id = await _app_with_initial_plan(tmp_path)
    experiment_id, _evaluation_id, _measurement_id = (
        await _seed_closed_experiment_with_measurement(app, session_id, project_id)
    )

    first = await app._enqueue_experiment_review_task(
        session_id=session_id,
        project_id=project_id,
        experiment_id=experiment_id,
        source_task_id="T999",
    )
    second = await app._enqueue_experiment_review_task(
        session_id=session_id,
        project_id=project_id,
        experiment_id=experiment_id,
        source_task_id="T999",
    )

    review_tasks = [
        task
        for task in await app.repos.tasks.list_for_session(session_id=session_id)
        if task.kind == TaskKind.REVIEW
        and task.payload.get("experiment_id") == experiment_id
    ]

    assert second.id == first.id
    assert len(review_tasks) == 1


async def test_route_review_followup_files_hypothesis_repair_task(
    tmp_path: Path,
) -> None:
    app, session_id, project_id = await _app_with_initial_plan(tmp_path)
    hypothesis = await app.repos.hypotheses.create(
        hypothesis_id="H1",
        project_id=project_id,
        created_in_session_id=session_id,
        title="Component A helps",
        summary="Component A may improve score.",
        status="active",
    )
    review_task = await app.repos.tasks.create(
        task_id=await app.repos.tasks.next_id(project_id=project_id),
        project_id=project_id,
        created_in_session_id=session_id,
        title=f"Review {hypothesis.title}",
        content="Review this hypothesis.",
        kind=TaskKind.REVIEW,
        work_type=TaskWorkType.REVIEW_HYPOTHESIS,
        priority="high",
        source_kind="system",
        payload={"hypothesis_id": hypothesis.id},
    )
    review_activity = await app.repos.hypothesis_activities.add(
        hypothesis_id=hypothesis.id,
        created_in_session_id=session_id,
        actor="critic",
        kind="comment",
        body="Hypothesis is too vague to test.",
        payload={
            "activity_type": "critic_review",
            "work_type": "review_hypothesis",
            "verdict": "concern",
            "recommended_next_step": "revise",
            "review_task_id": review_task.id,
            "concern_kinds": ["vague"],
        },
    )

    followup = await app._route_review_followup(
        session_id=session_id,
        review_task=review_task,
    )

    assert followup is not None
    assert followup.kind == TaskKind.HYPOTHESIZE
    assert followup.payload["associated_hypothesis_id"] == hypothesis.id
    assert (
        followup.payload["associated_review_activity_id"] == review_activity.id
    )
    assert followup.payload["associated_review_task_id"] == review_task.id

    links = await app.repos.task_entity_links.list_for_task(task_id=followup.id)
    linked = {(link.entity_kind, link.entity_id) for link in links}
    assert (TaskEntityKind.HYPOTHESIS, hypothesis.id) in linked
    assert (
        TaskEntityKind.HYPOTHESIS_ACTIVITY,
        str(review_activity.id),
    ) in linked


async def test_route_review_followup_dedups_repeated_calls(
    tmp_path: Path,
) -> None:
    app, session_id, project_id = await _app_with_initial_plan(tmp_path)
    hypothesis = await app.repos.hypotheses.create(
        hypothesis_id="H1",
        project_id=project_id,
        created_in_session_id=session_id,
        title="Component A helps",
        summary="Component A may improve score.",
        status="active",
    )
    review_task = await app.repos.tasks.create(
        task_id=await app.repos.tasks.next_id(project_id=project_id),
        project_id=project_id,
        created_in_session_id=session_id,
        title=f"Review {hypothesis.title}",
        content="Review this hypothesis.",
        kind=TaskKind.REVIEW,
        work_type=TaskWorkType.REVIEW_HYPOTHESIS,
        priority="high",
        source_kind="system",
        payload={"hypothesis_id": hypothesis.id},
    )
    await app.repos.hypothesis_activities.add(
        hypothesis_id=hypothesis.id,
        created_in_session_id=session_id,
        actor="critic",
        kind="comment",
        body="Vague.",
        payload={
            "activity_type": "critic_review",
            "verdict": "concern",
            "recommended_next_step": "revise",
            "review_task_id": review_task.id,
        },
    )

    first = await app._route_review_followup(
        session_id=session_id,
        review_task=review_task,
    )
    second = await app._route_review_followup(
        session_id=session_id,
        review_task=review_task,
    )

    assert first is not None
    assert second is None
    repair_tasks = [
        task
        for task in await app.repos.tasks.list_for_project(project_id=project_id)
        if task.kind == TaskKind.HYPOTHESIZE
        and task.payload.get("associated_hypothesis_id") == hypothesis.id
    ]
    assert len(repair_tasks) == 1


async def test_route_review_followup_returns_none_for_usable_verdict(
    tmp_path: Path,
) -> None:
    app, session_id, project_id = await _app_with_initial_plan(tmp_path)
    experiment_id, _evaluation_id, _measurement_id = (
        await _seed_closed_experiment_with_measurement(app, session_id, project_id)
    )
    review_task = await app._enqueue_experiment_review_task(
        session_id=session_id,
        project_id=project_id,
        experiment_id=experiment_id,
        source_task_id="T999",
    )
    await app.repos.experiment_activities.add(
        experiment_id=experiment_id,
        created_in_session_id=session_id,
        actor="critic",
        kind="comment",
        body="Looks good.",
        payload={
            "activity_type": "critic_review",
            "verdict": "usable",
            "recommended_next_step": "accept",
            "review_task_id": review_task.id,
        },
    )

    followup = await app._route_review_followup(
        session_id=session_id,
        review_task=review_task,
    )

    assert followup is None


async def test_route_review_followup_files_experiment_reproduction_task(
    tmp_path: Path,
) -> None:
    app, session_id, project_id = await _app_with_initial_plan(tmp_path)
    experiment_id, _evaluation_id, _measurement_id = (
        await _seed_closed_experiment_with_measurement(app, session_id, project_id)
    )
    review_task = await app._enqueue_experiment_review_task(
        session_id=session_id,
        project_id=project_id,
        experiment_id=experiment_id,
        source_task_id="T999",
    )
    review_activity = await app.repos.experiment_activities.add(
        experiment_id=experiment_id,
        created_in_session_id=session_id,
        actor="critic",
        kind="comment",
        body="Promising but thin.",
        payload={
            "activity_type": "critic_review",
            "work_type": "review_experiment",
            "verdict": "needs_reproduction",
            "recommended_next_step": "reproduce",
            "review_task_id": review_task.id,
            "concern_kinds": ["selection_on_noise"],
        },
    )

    followup = await app._route_review_followup(
        session_id=session_id,
        review_task=review_task,
    )

    assert followup is not None
    assert followup.kind == TaskKind.EXPERIMENT
    assert followup.payload["associated_experiment_id"] == experiment_id
    assert followup.payload["parent_experiment_id"] == experiment_id
    assert followup.payload["base_selector"] == "parent_experiment"
    assert followup.payload["associated_review_activity_id"] == review_activity.id

    links = await app.repos.task_entity_links.list_for_task(task_id=followup.id)
    linked = {(link.entity_kind, link.entity_id) for link in links}
    assert (TaskEntityKind.EXPERIMENT, experiment_id) in linked
    assert (
        TaskEntityKind.EXPERIMENT_ACTIVITY,
        str(review_activity.id),
    ) in linked


async def test_route_review_followup_returns_none_when_work_type_missing(
    tmp_path: Path,
) -> None:
    app, session_id, project_id = await _app_with_initial_plan(tmp_path)
    review_task = await app.repos.tasks.create(
        task_id=await app.repos.tasks.next_id(project_id=project_id),
        project_id=project_id,
        created_in_session_id=session_id,
        title="Legacy review",
        content="Legacy review without a work_type.",
        kind=TaskKind.REVIEW,
        priority="high",
        source_kind="system",
        payload={"experiment_id": "EX-NONE"},
    )

    followup = await app._route_review_followup(
        session_id=session_id,
        review_task=review_task,
    )

    assert followup is None


async def test_reusable_plan_task_is_requeued_for_replanning(
    tmp_path: Path,
) -> None:
    app, session_id, project_id = await _app_with_initial_plan(tmp_path)

    first = await app._reusable_plan_task(project_id=project_id)
    assert first is not None
    done = await app.repos.tasks.update(
        task_id=first.id,
        status=TaskStatus.DONE,
        result_summary="First pass completed.",
        completed_in_session_id=session_id,
    )
    assert done is not None
    assert done.status == TaskStatus.DONE

    second = await app._enqueue_plan_task(
        session_id=session_id,
        project_id=project_id,
        title="Plan after Researcher task completion",
        content="Review the researcher output and file the next runnable task.",
        source_kind="system",
    )

    plan_tasks = [
        task
        for task in await app.repos.tasks.list_for_session(session_id=session_id)
        if task.kind == TaskKind.PLAN
    ]
    activities = await app.repos.task_activities.list_for_task(task_id=second.id)

    assert second.id == first.id
    assert second.title == "Plan next step"
    assert second.status == TaskStatus.BACKLOG
    assert second.result_summary is None
    assert second.completed_at is None
    assert second.payload["planning_pass_count"] == 2
    assert second.payload["last_trigger_title"] == "Plan after Researcher task completion"
    assert len(plan_tasks) == 1
    assert [activity.payload["activity_type"] for activity in activities] == [
        "planning_task_queued",
        "planning_task_requeued",
    ]


async def test_default_session_start_creates_fresh_project_per_session(
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

    first = await app.session_start(
        {
            "objective": "Improve score",
            "research_context": "Run local evals.",
            "max_experiments": 1,
        }
    )
    second = await app.session_start(
        {
            "objective": "Improve score again",
            "research_context": "Run local evals again.",
            "max_experiments": 1,
        }
    )

    sessions = await app.repos.sessions.list_all()
    projects = await app.repos.projects.list_all()
    started_events = [
        event for event in await app.repos.events.list_all() if event.type == "session.started"
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


async def test_session_start_refuses_dirty_git_workspace_before_creating_records(
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
        await app.session_start(
            {
                "objective": "Improve score",
                "research_context": "Run local evals.",
                "max_experiments": 1,
            }
        )

    assert await app.repos.projects.list_all() == []
    assert await app.repos.sessions.list_all() == []
    assert not [
        event for event in await app.repos.events.list_all() if event.type == "session.started"
    ]


async def test_session_loop_retries_manager_before_no_progress_close(
    tmp_path: Path,
    monkeypatch,
) -> None:
    app, session_id, _project_id = await _app_with_initial_plan(tmp_path)
    runtime = NoProgressRuntime()
    monkeypatch.setattr("situ.harness.app.AgentRuntime", lambda _project_dir: runtime)

    await app._execute_session_async(session_id=session_id, max_experiments=1)

    session = await app.repos.sessions.get(session_id=session_id)
    tasks = await app.repos.tasks.list_for_session(session_id=session_id)

    assert session is not None
    assert session.status == "closed"
    assert runtime.plan_calls == MANAGER_NO_PROGRESS_LIMIT
    assert runtime.scientist_calls == 0
    assert [task.kind for task in tasks] == [TaskKind.PLAN]
    assert tasks[0].status == TaskStatus.DONE
    assert tasks[0].payload["planning_pass_count"] == MANAGER_NO_PROGRESS_LIMIT
    planning_activities = await app.repos.task_activities.list_for_task(task_id=tasks[0].id)
    expected_activity_types = ["planning_task_queued", "planning_task_completed"]
    for _ in range(MANAGER_NO_PROGRESS_LIMIT - 1):
        expected_activity_types.append("planning_task_requeued")
        expected_activity_types.append("planning_task_completed")
    assert [
        activity.payload["activity_type"]
        for activity in planning_activities
    ] == expected_activity_types
    assert planning_activities[-1].body == (
        "Completed planning pass: no runnable task filed"
    )
    assert any(
        event.type == "session.completed"
        and "no runnable researcher, scientist, or critic task"
        in event.message.lower()
        for event in await app.repos.events.list_for_session(session_id=session_id)
    )


async def test_session_loop_closes_immediately_when_project_is_closed_by_manager(
    tmp_path: Path,
    monkeypatch,
) -> None:
    app, session_id, project_id = await _app_with_initial_plan(tmp_path)
    runtime = CloseProjectRuntime()
    monkeypatch.setattr("situ.harness.app.AgentRuntime", lambda _project_dir: runtime)

    await app._execute_session_async(session_id=session_id, max_experiments=10)

    session = await app.repos.sessions.get(session_id=session_id)
    tasks = await app.repos.tasks.list_for_session(session_id=session_id)

    assert session is not None
    assert session.status == "closed"
    assert runtime.plan_calls == 1
    assert runtime.scientist_calls == 0
    assert [task.kind for task in tasks] == [TaskKind.PLAN]
    assert any(
        event.type == "session.completed"
        and "manager confirmation" in event.message.lower()
        and event.associated_project_id == project_id
        for event in await app.repos.events.list_for_session(session_id=session_id)
    )


async def test_session_loop_runs_researcher_tasks_before_scientist_work(
    tmp_path: Path,
    monkeypatch,
) -> None:
    app, session_id, _project_id = await _app_with_initial_plan(tmp_path)
    runtime = ResearcherThenNoProgressRuntime()
    monkeypatch.setattr("situ.harness.app.AgentRuntime", lambda _project_dir: runtime)

    await app._execute_session_async(session_id=session_id, max_experiments=1)

    tasks = await app.repos.tasks.list_for_session(session_id=session_id)
    analyses = await app.repos.analyses.list_for_session(session_id=session_id)

    assert runtime.researcher_calls == 1
    assert runtime.scientist_calls == 0
    assert [analysis.title for analysis in analyses] == ["Codebase knobs"]
    assert any(task.kind == TaskKind.RESEARCH and task.status == TaskStatus.DONE for task in tasks)
    assert any(
        event.type == "session.researcher_completed"
        for event in await app.repos.events.list_for_session(session_id=session_id)
    )


async def test_failed_experiment_task_still_records_worktree_state(
    tmp_path: Path,
    monkeypatch,
) -> None:
    app, session_id, _project_id = await _app_with_initial_plan(tmp_path)
    runtime = FailingExperimentRuntime()
    monkeypatch.setattr("situ.harness.app.AgentRuntime", lambda _project_dir: runtime)

    await app._execute_session_async(session_id=session_id, max_experiments=1)

    session = await app.repos.sessions.get(session_id=session_id)
    tasks = await app.repos.tasks.list_for_session(session_id=session_id)
    experiments = await app.repos.experiments.list_for_session(session_id=session_id)

    assert session is not None
    assert session.status == "closed"
    assert experiments
    assert tasks[-1].status == TaskStatus.FAILED
    assert runtime.scientist_repo_path is not None
    activities = await app.repos.experiment_activities.list_for_experiment(experiment_id=experiments[0].id)
    assert activities[-1].payload["activity_type"] == "workspace_state"
    assert activities[-1].payload["worktree"]["dirty"] is True
    assert activities[-1].payload["worktree"]["changes"] == [
        {"status": " M", "path": "README.md"}
    ]
    assert any(
        event.type == "session.failed"
        for event in await app.repos.events.list_for_session(session_id=session_id)
    )


async def test_session_loop_retries_timed_out_agent_pass_and_records_activity(
    tmp_path: Path,
    monkeypatch,
) -> None:
    app, session_id, project_id = await _app_with_initial_plan(tmp_path)
    runtime = TimeoutThenCloseRuntime()
    monkeypatch.setattr("situ.harness.app.AgentRuntime", lambda _project_dir: runtime)

    await app._execute_session_async(session_id=session_id, max_experiments=1)

    session = await app.repos.sessions.get(session_id=session_id)
    task = (await app.repos.tasks.list_for_session(session_id=session_id))[0]
    activities = await app.repos.task_activities.list_for_task(task_id=task.id)
    timeout_events = [
        event
        for event in await app.repos.events.list_for_session(session_id=session_id)
        if event.type == "session.agent_timeout"
    ]

    assert session is not None
    assert session.status == "closed"
    assert runtime.plan_calls == 2
    assert task.status == TaskStatus.DONE
    assert [event.associated_project_id for event in timeout_events] == [project_id]
    assert timeout_events[0].payload["will_retry"] is True
    assert any(
        activity.payload.get("activity_type") == "agent_pass_timeout"
        and activity.payload["will_retry"] is True
        for activity in activities
    )
    assert not [
        event
        for event in await app.repos.events.list_for_session(session_id=session_id)
        if event.type == "session.failed"
    ]


class BaselineThenExperimentRuntime:
    def __init__(self) -> None:
        self.plan_calls = 0
        self.critic_calls = 0
        self.scientist_task_kinds: list[str] = []
        self.scientist_repo_paths: list[str | None] = []

    async def plan_session(self, **kwargs: Any) -> ResearchAgentOutput:
        self.plan_calls += 1
        repos = kwargs["repos"]
        session_id = kwargs["session_id"]
        session = await repos.sessions.get(session_id=session_id)
        project_id = session.project_id if session is not None else None
        assert project_id is not None

        if self.plan_calls == 1:
            await repos.tasks.create(
                task_id=await repos.tasks.next_id(project_id=project_id),
                project_id=project_id,
                created_in_session_id=session_id,
                title="Establish baseline",
                content="Run the baseline measurement.",
                kind=TaskKind.BASELINE,
                priority="high",
                source_kind="manager",
            )
            return ResearchAgentOutput(summary="filed baseline")

        await repos.tasks.create(
            task_id=await repos.tasks.next_id(project_id=project_id),
            project_id=project_id,
            created_in_session_id=session_id,
            title="Try candidate",
            content="Run one candidate experiment.",
            kind=TaskKind.EXPERIMENT,
            priority="high",
            source_kind="manager",
        )
        return ResearchAgentOutput(summary="filed experiment")

    async def run_session(self, **kwargs: Any) -> ResearchAgentOutput:
        repos = kwargs["repos"]
        session_id = kwargs["session_id"]
        assigned_task_ids = kwargs["assigned_task_ids"]
        task = await repos.tasks.get(task_id=assigned_task_ids[0])
        assert task is not None
        session = await repos.sessions.get(session_id=session_id)
        project_id = session.project_id if session is not None else None
        assert project_id is not None

        self.scientist_task_kinds.append(task.kind.value)
        self.scientist_repo_paths.append(kwargs.get("repo_path"))
        if task.kind == "baseline":
            baseline = await repos.baselines.create(
                baseline_id="B1",
                project_id=project_id,
                created_in_session_id=session_id,
                title="Baseline",
                summary="Reference behavior.",
                status="closed",
            )
            evaluation = await repos.evaluations.create(
                evaluation_id="EV1",
                project_id=project_id,
                created_in_session_id=session_id,
                title="Baseline",
                summary="Baseline evidence.",
                associated_baseline_id=baseline.id,
                status="closed",
            )
            await repos.measurements.add(
                evaluation_id=evaluation.id,
                created_in_session_id=session_id,
                actor="agent",
                body="baseline result",
            )
            return ResearchAgentOutput(summary="baseline done")

        experiment_id = task.payload["experiment_id"]
        repo_path = kwargs["repo_path"]
        assert repo_path is not None
        (Path(repo_path) / "README.md").write_text("candidate workspace\n")
        await repos.experiments.update(
            experiment_id=experiment_id,
            title="Try candidate",
            summary="Candidate result.",
            status="closed",
        )
        return ResearchAgentOutput(summary="experiment done")

    async def run_review(self, **kwargs: Any) -> ResearchAgentOutput:
        self.critic_calls += 1
        repos = kwargs["repos"]
        task = await repos.tasks.get(task_id=kwargs["assigned_task_ids"][0])
        assert task is not None
        experiment_id = task.payload["experiment_id"]
        await repos.experiment_activities.add(
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

    async def plan_session(self, **kwargs: Any) -> ResearchAgentOutput:
        self.plan_calls += 1
        repos = kwargs["repos"]
        session_id = kwargs["session_id"]
        session = await repos.sessions.get(session_id=session_id)
        project_id = session.project_id if session is not None else None
        assert project_id is not None
        if self.plan_calls == 1:
            await repos.tasks.create(
                task_id=await repos.tasks.next_id(project_id=project_id),
                project_id=project_id,
                created_in_session_id=session_id,
                title="Establish baseline only",
                content="Run the baseline measurement.",
                kind=TaskKind.BASELINE,
                priority="high",
                source_kind="manager",
            )
        return ResearchAgentOutput(summary="baseline plan")

    async def run_session(self, **kwargs: Any) -> ResearchAgentOutput:
        repos = kwargs["repos"]
        session_id = kwargs["session_id"]
        session = await repos.sessions.get(session_id=session_id)
        project_id = session.project_id if session is not None else None
        assert project_id is not None
        baseline = await repos.baselines.create(
            baseline_id="B1",
            project_id=project_id,
            created_in_session_id=session_id,
            title="Baseline",
            summary="Reference behavior.",
            status="closed",
        )
        evaluation = await repos.evaluations.create(
            evaluation_id="EV1",
            project_id=project_id,
            created_in_session_id=session_id,
            title="Baseline",
            summary="Baseline evidence.",
            associated_baseline_id=baseline.id,
            status="closed",
        )
        await repos.measurements.add(
            evaluation_id=evaluation.id,
            created_in_session_id=session_id,
            actor="agent",
            body="baseline result",
        )
        return ResearchAgentOutput(summary="baseline done")

    async def run_review(self, **_kwargs: Any) -> ResearchAgentOutput:
        self.critic_calls += 1
        return ResearchAgentOutput(summary="should not review baseline")


class NoProgressRuntime:
    def __init__(self) -> None:
        self.plan_calls = 0
        self.scientist_calls = 0

    async def plan_session(self, **_kwargs: Any) -> ResearchAgentOutput:
        self.plan_calls += 1
        return ResearchAgentOutput(summary="no runnable task filed")

    async def run_session(self, **_kwargs: Any) -> ResearchAgentOutput:
        self.scientist_calls += 1
        return ResearchAgentOutput(summary="should not run")


class CloseProjectRuntime:
    def __init__(self) -> None:
        self.plan_calls = 0
        self.scientist_calls = 0

    async def plan_session(self, **kwargs: Any) -> ResearchAgentOutput:
        self.plan_calls += 1
        repos = kwargs["repos"]
        session_id = kwargs["session_id"]
        session = await repos.sessions.get(session_id=session_id)
        project_id = session.project_id if session is not None else None
        assert project_id is not None
        await repos.projects.update(project_id=project_id, status="closed")
        return ResearchAgentOutput(summary="confirmed close")

    async def run_session(self, **_kwargs: Any) -> ResearchAgentOutput:
        self.scientist_calls += 1
        return ResearchAgentOutput(summary="should not run")


class ResearcherThenNoProgressRuntime:
    def __init__(self) -> None:
        self.plan_calls = 0
        self.researcher_calls = 0
        self.scientist_calls = 0

    async def plan_session(self, **kwargs: Any) -> ResearchAgentOutput:
        self.plan_calls += 1
        repos = kwargs["repos"]
        session_id = kwargs["session_id"]
        session = await repos.sessions.get(session_id=session_id)
        project_id = session.project_id if session is not None else None
        assert project_id is not None
        if self.plan_calls == 1:
            await repos.tasks.create(
                task_id=await repos.tasks.next_id(project_id=project_id),
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

    async def run_research(self, **kwargs: Any) -> ResearchAgentOutput:
        self.researcher_calls += 1
        repos = kwargs["repos"]
        session_id = kwargs["session_id"]
        session = await repos.sessions.get(session_id=session_id)
        project_id = session.project_id if session is not None else None
        assert project_id is not None
        await repos.analyses.create(
            analysis_id="A1",
            project_id=project_id,
            created_in_session_id=session_id,
            status="open",
            title="Codebase knobs",
            summary="The main knobs are scoring weights.",
            content="Tune scoring weights before trying broader changes.",
        )
        return ResearchAgentOutput(summary="research done")

    async def run_session(self, **_kwargs: Any) -> ResearchAgentOutput:
        self.scientist_calls += 1
        return ResearchAgentOutput(summary="should not run")


class FailingExperimentRuntime:
    def __init__(self) -> None:
        self.plan_calls = 0
        self.scientist_repo_path: str | None = None

    async def plan_session(self, **kwargs: Any) -> ResearchAgentOutput:
        self.plan_calls += 1
        repos = kwargs["repos"]
        session_id = kwargs["session_id"]
        session = await repos.sessions.get(session_id=session_id)
        project_id = session.project_id if session is not None else None
        assert project_id is not None
        await repos.tasks.create(
            task_id=await repos.tasks.next_id(project_id=project_id),
            project_id=project_id,
            created_in_session_id=session_id,
            title="Try candidate",
            content="Run one candidate experiment.",
            kind=TaskKind.EXPERIMENT,
            priority="high",
            source_kind="manager",
        )
        return ResearchAgentOutput(summary="filed experiment")

    async def run_session(self, **kwargs: Any) -> ResearchAgentOutput:
        repo_path = kwargs["repo_path"]
        assert repo_path is not None
        self.scientist_repo_path = repo_path
        (Path(repo_path) / "README.md").write_text("partial candidate\n")
        raise RuntimeError("candidate crashed")


class TimeoutThenCloseRuntime:
    def __init__(self) -> None:
        self.plan_calls = 0

    async def plan_session(self, **kwargs: Any) -> ResearchAgentOutput:
        self.plan_calls += 1
        if self.plan_calls == 1:
            raise TimeoutError("model request timed out")
        repos = kwargs["repos"]
        session_id = kwargs["session_id"]
        session = await repos.sessions.get(session_id=session_id)
        project_id = session.project_id if session is not None else None
        assert project_id is not None
        await repos.projects.update(project_id=project_id, status="closed")
        return ResearchAgentOutput(summary="closed after retry")

    async def run_session(self, **_kwargs: Any) -> ResearchAgentOutput:
        return ResearchAgentOutput(summary="should not run")


async def _app_with_initial_plan(tmp_path: Path) -> tuple[HarnessApp, str, str]:
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
    workspace_record = await app.repos.workspaces.ensure()
    project = await app.repos.projects.create(
        project_id="P1",
        workspace_id=workspace_record.id,
        title="Improve score",
        objective="Improve score.",
        research_context="Run local evals.",
    )
    session = await app.repos.sessions.create(
        session_id="S1",
        workspace_id=workspace_record.id,
        project_id=project.id,
    )
    app._session_setup[session.id] = {
        "objective": project.objective,
        "research_context": project.research_context,
    }
    await app._ensure_project_agents(session_id=session.id, project_id=project.id)
    await app._enqueue_plan_task(
        session_id=session.id,
        project_id=project.id,
        title="Plan first pass",
        content="File first Scientist work.",
        source_kind="system",
    )
    return app, session.id, project.id


async def _seed_closed_experiment_with_measurement(
    app: HarnessApp,
    session_id: str,
    project_id: str,
) -> tuple[str, str, str]:
    workspace = await app.repos.workspaces.get()
    assert workspace is not None
    experiment = await app.repos.experiments.create(
        experiment_id="EX1",
        project_id=project_id,
        created_in_session_id=session_id,
        title="Try candidate",
        summary="Candidate result.",
        status="closed",
        worktree_path=workspace.repo_path,
        base_commit="test-base",
    )
    evaluation = await app.repos.evaluations.create(
        evaluation_id="EV1",
        project_id=project_id,
        created_in_session_id=session_id,
        title="Candidate eval",
        summary="Candidate evidence.",
        associated_experiment_id=experiment.id,
        status="closed",
    )
    measurement = await app.repos.measurements.add(
        evaluation_id=evaluation.id,
        created_in_session_id=session_id,
        actor="agent",
        body="candidate result",
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
