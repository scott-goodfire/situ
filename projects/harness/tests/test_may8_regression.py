from __future__ import annotations

import asyncio
import json
import subprocess
from pathlib import Path
from typing import Any

import pytest
from pydantic_ai import RunContext
from pydantic_ai.models.test import TestModel
from pydantic_ai.usage import RunUsage

from situ.harness.app import HarnessApp
from situ.harness.core.dbos import task_workflows
from situ.harness.records import (
    RecordStatus,
    SessionStatus,
    TaskEntityKind,
    TaskKind,
    TaskStatus,
)
from situ.harness.tools import build_workspace_toolset
from situ.harness.tools.common import SituToolDeps

pytestmark = pytest.mark.asyncio


async def test_may8_parallel_execute_and_deep_queue_replay(
    tmp_path: Path,
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    app, session_id, project_id = await _seed_may8_replay_world(tmp_path)
    task = await app.repos.tasks.get(task_id="T1")
    assert task is not None

    deps = SituToolDeps(
        session_id=session_id,
        agent_id="agent_P1_scientist_T1",
        project_id=project_id,
        project_dir=app.context.project_dir,
        repo_path=str(app.context.repo_root),
        active_task_id=task.id,
        active_experiment_id="EX1",
        repos=app.repos,
    )
    toolset = build_workspace_toolset()
    assert toolset.tools["execute"].sequential is True

    ctx = RunContext(
        deps=deps,
        model=TestModel(),
        usage=RunUsage(),
    )
    tools = await toolset.get_tools(ctx)

    async def run_harness_like_command() -> Any:
        return await toolset.call_tool(
            "execute",
            {
                "command": (
                    "python -c 'print(\"dev_accuracy: 0.748148\"); "
                    "print(\"dev_wps: 140.7\")'"
                ),
                "timeout": 5,
            },
            ctx,
            tools["execute"],
        )

    first, second = await asyncio.gather(
        run_harness_like_command(),
        run_harness_like_command(),
    )

    artifacts = await app.repos.artifacts.list_for_project(project_id=project_id)
    receipt_links = [
        link
        for link in await app.repos.task_entity_links.list_for_task(task_id=task.id)
        if link.entity_kind == TaskEntityKind.ARTIFACT
    ]
    refreshed_task = await app.repos.tasks.get(task_id=task.id)

    assert "dev_accuracy: 0.748148" in str(first)
    assert "dev_accuracy: 0.748148" in str(second)
    assert [artifact.id for artifact in artifacts] == ["ART1", "ART2"]
    assert [artifact.kind for artifact in artifacts] == [
        "command_receipt",
        "command_receipt",
    ]
    assert {
        (artifact.associated_entity_kind, artifact.associated_entity_id)
        for artifact in artifacts
    } == {("experiment", "EX1")}
    assert {
        json.loads((app.context.project_dir / artifact.path).read_text())["metrics"][
            "dev_accuracy"
        ]["value"]
        for artifact in artifacts
    } == {0.748148}
    assert {link.entity_id for link in receipt_links} == {"ART1", "ART2"}
    assert refreshed_task is not None
    assert refreshed_task.status == TaskStatus.BACKLOG

    manager_task = await app.repos.tasks.create(
        task_id=await app.repos.tasks.next_id(project_id=project_id),
        project_id=project_id,
        created_in_session_id=session_id,
        title="Plan next step",
        content="Do not file more work when the runnable queue is already deep.",
        kind=TaskKind.PLAN,
        priority="normal",
        source_kind="system",
    )

    class NoopManagerRuntime:
        model_name = "test-model"

        async def plan_session(self, **_kwargs: Any) -> Any:
            class Result:
                summary = "Existing experiment backlog is enough for this pass."

                def model_dump(self) -> dict[str, Any]:
                    return {"summary": self.summary}

            return Result()

    async def fake_get_agent_runtime(_project_dir: Path) -> NoopManagerRuntime:
        return NoopManagerRuntime()

    monkeypatch.setattr(
        "situ.harness.agent_runtime.get_agent_runtime",
        fake_get_agent_runtime,
    )

    await task_workflows._run_manager_workflow_body(
        context=app.context,
        repos=app.repos,
        task_id=manager_task.id,
        session_id=session_id,
        project_id=project_id,
    )

    finished_manager_task = await app.repos.tasks.get(task_id=manager_task.id)
    session = await app.repos.sessions.get(session_id=session_id)
    failed_events = [
        event
        for event in await app.repos.events.list_for_session(session_id=session_id)
        if event.type == "session.failed"
    ]
    experiment_tasks = [
        task
        for task in await app.repos.tasks.list_for_project(project_id=project_id)
        if task.kind == TaskKind.EXPERIMENT
    ]

    assert finished_manager_task is not None
    assert finished_manager_task.status == TaskStatus.DONE
    assert session is not None
    assert session.status == SessionStatus.ACTIVE
    assert failed_events == []
    assert len(experiment_tasks) == 7
    assert all(task.status == TaskStatus.BACKLOG for task in experiment_tasks)


async def _seed_may8_replay_world(
    tmp_path: Path,
) -> tuple[HarnessApp, str, str]:
    workspace = tmp_path / "workspace"
    workspace.mkdir()
    _git(workspace, "init")
    (workspace / "spell.py").write_text("def correction(word):\n    return word\n")
    _git(workspace, "add", ".")
    _commit(workspace, "baseline")

    app = await HarnessApp.create(
        workspace,
        app_root=Path.cwd(),
        project_home=tmp_path / "home",
        notify=_noop_notify,
    )
    workspace_record = await app.repos.workspaces.ensure()
    project = await app.repos.projects.create(
        project_id="P1",
        workspace_id=workspace_record.id,
        title="Improve spelling corrector",
        objective="Improve dev accuracy while keeping dev_wps >= 100.",
        research_context="Use the project harness and keep experiments bounded.",
    )
    session = await app.repos.sessions.create(
        session_id="S1",
        workspace_id=workspace_record.id,
        project_id=project.id,
    )
    baseline = await app.repos.baselines.create(
        baseline_id="B1",
        project_id=project.id,
        created_in_session_id=session.id,
        title="Replicated baseline",
        summary="Three baseline runs were accepted.",
        status=RecordStatus.DONE,
    )
    evaluation = await app.repos.evaluations.create(
        evaluation_id="EV1",
        project_id=project.id,
        created_in_session_id=session.id,
        title="Baseline harness runs",
        summary="Reference accuracy and throughput.",
        associated_baseline_id=baseline.id,
        status=RecordStatus.DONE,
    )
    await app.repos.measurements.add(
        evaluation_id=evaluation.id,
        created_in_session_id=session.id,
        actor="agent",
        body="Baseline run: dev_accuracy 0.748148, dev_wps 140.7.",
        payload={
            "metrics": {
                "dev_accuracy": {"value": 0.748148},
                "dev_wps": {"value": 140.7},
            }
        },
    )

    for index in range(1, 8):
        hypothesis = await app.repos.hypotheses.create(
            hypothesis_id=f"H{index}",
            project_id=project.id,
            created_in_session_id=session.id,
            title=f"Candidate thread {index}",
            summary="Accepted candidate thread for Scientist work.",
            status=RecordStatus.ACCEPTED,
        )
        task = await app.repos.tasks.create(
            task_id=await app.repos.tasks.next_id(project_id=project.id),
            project_id=project.id,
            created_in_session_id=session.id,
            title=f"Run candidate {index}",
            content="Run this candidate experiment and record evidence.",
            kind=TaskKind.EXPERIMENT,
            priority="high",
            source_kind="manager",
            payload={"hypothesis_ids": [hypothesis.id]},
        )
        await app.repos.task_entity_links.create(
            project_id=project.id,
            task_id=task.id,
            entity_kind=TaskEntityKind.HYPOTHESIS,
            entity_id=hypothesis.id,
            relationship="tests",
        )

    experiment = await app.repos.experiments.create(
        experiment_id="EX1",
        project_id=project.id,
        created_in_session_id=session.id,
        title="Test two-word split fallback",
        summary="May 8 replay candidate that produced duplicate receipt writes.",
        status=RecordStatus.ACTIVE,
    )
    await app.repos.task_entity_links.create(
        project_id=project.id,
        task_id="T1",
        entity_kind=TaskEntityKind.EXPERIMENT,
        entity_id=experiment.id,
        relationship="produces",
    )

    return app, session.id, project.id


async def _noop_notify(_method: str, _params: dict[str, Any]) -> None:
    return None


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
