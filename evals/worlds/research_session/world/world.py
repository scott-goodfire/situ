from __future__ import annotations

import subprocess
from pathlib import Path
from tempfile import TemporaryDirectory
from typing import Any

from situ.harness.api.project_board import ProjectBoardService
from situ.harness.core.db import Database
from situ.harness.repositories import Repositories
from evals.framework.models import EvalEvent
from evals.worlds.research_session.models import ResearchSessionSeed

WORKSPACE_ID = "workspace_eval"
PROJECT_ID = "P1"
SESSION_ID = "S1"
SCIENTIST_AGENT_ID = f"agent_{PROJECT_ID}_scientist"
HYPOTHESIS_ID = "H1"
EXPERIMENT_ID = "EX1"
ARTIFACT_ID = "ART1"
ANALYSIS_ID = "A1"
TASK_ID = "T1"
BASELINE_ID = "B1"
BASELINE_EVALUATION_ID = "EV1"
COMPONENT_A_EXPERIMENT_ID = "EX1"
COMPONENT_C_EXPERIMENT_ID = "EX2"

RESEARCH_CONTEXT_BODY = (
    "Use local eval scripts and compare score, latency_ms, and safety notes. "
    "Expected signals: score, latency_ms, tests_passed. "
    "Scope: baseline, simple variants, and promising combinations."
)


class ResearchSessionWorld:
    def __init__(self, *, seed: ResearchSessionSeed) -> None:
        self._tmp = TemporaryDirectory()
        self.path = Path(self._tmp.name)
        self.repo_path = self.path / "workspace"
        self.repo_path.mkdir()
        if seed == "with_dirty_workspace":
            _seed_dirty_workspace(self.repo_path)
        self.repos: Repositories
        self.events: list[EvalEvent] = []
        self.seed = seed

    @classmethod
    async def create(cls, *, seed: ResearchSessionSeed) -> "ResearchSessionWorld":
        world = cls(seed=seed)
        world.repos = await _build_repos(
            world.path,
            repo_path=world.repo_path,
            attach_project=seed != "projectless",
        )
        await _seed(world.repos, seed)
        return world

    def teardown(self) -> None:
        self._tmp.cleanup()

    def emit_event(
        self,
        event_type: str,
        message: str,
        associated_project_id: str | None,
        associated_session_id: str | None,
        payload: dict[str, Any] | None,
    ) -> dict[str, Any]:
        record = self.repos.events.add(
            event_type=event_type,
            message=message,
            associated_project_id=associated_project_id,
            associated_session_id=associated_session_id,
            payload=payload or {},
        )
        event = EvalEvent(
            event_type=event_type,
            message=message,
            payload={
                "id": record.id,
                "associated_project_id": associated_project_id,
                "associated_session_id": associated_session_id,
                **(payload or {}),
            },
        )
        self.events.append(event)
        return record.model_dump()

    async def project_board(self) -> dict[str, Any]:
        graph = await ProjectBoardService(repos=self.repos).get_project_board(
            session_id=SESSION_ID
        )
        return {
            "workspace": graph.workspace.model_dump() if graph.workspace is not None else None,
            "project": graph.project.model_dump() if graph.project is not None else None,
            "session": graph.session.model_dump() if graph.session is not None else None,
            "agents": [item.model_dump() for item in graph.agents],
            "tasks": [item.model_dump() for item in graph.tasks],
            "task_dependencies": [
                item.model_dump() for item in graph.task_dependencies
            ],
            "task_entity_links": [
                item.model_dump() for item in graph.task_entity_links
            ],
            "task_activities": [
                item.model_dump() for item in graph.task_activities
            ],
            "analyses": [item.model_dump() for item in graph.analyses],
            "analysis_activities": [
                item.model_dump() for item in graph.analysis_activities
            ],
            "hypotheses": [item.model_dump() for item in graph.hypotheses],
            "baselines": [item.model_dump() for item in graph.baselines],
            "experiments": [item.model_dump() for item in graph.experiments],
            "evaluations": [item.model_dump() for item in graph.evaluations],
            "measurements": [item.model_dump() for item in graph.measurements],
            "hypothesis_experiment_links": [
                item.model_dump() for item in graph.hypothesis_experiment_links
            ],
            "hypothesis_activities": [
                item.model_dump() for item in graph.hypothesis_activities
            ],
            "experiment_activities": [
                item.model_dump() for item in graph.experiment_activities
            ],
            "evaluation_activities": [
                item.model_dump() for item in graph.evaluation_activities
            ],
            "artifacts": [item.model_dump() for item in graph.artifacts],
            "events": [item.model_dump() for item in graph.events],
        }


async def _build_repos(
    path: Path,
    *,
    repo_path: Path,
    attach_project: bool,) -> Repositories:
    db = Database(
        path / "situ.sqlite",
        workspace_id=WORKSPACE_ID,
        repo_path=str(repo_path),
    )
    repos = Repositories.create(db)
    workspace = await repos.workspaces.ensure()
    project_id = None
    if attach_project:
        project = await repos.projects.create(
            project_id=PROJECT_ID,
            workspace_id=workspace.id,
            title="Improve validation score",
            objective="Improve validation score without worsening latency.",
            research_context=RESEARCH_CONTEXT_BODY,
        )
        project_id = project.id
    await repos.sessions.create(session_id=SESSION_ID, workspace_id=workspace.id, project_id=project_id)
    if project_id is not None:
        await repos.agents.ensure_session_agent(
            session_id=SESSION_ID,
            kind="scientist",
            display_name="Scientist",
            model_name="eval:model",
        )
    return repos


async def _seed(repos: Repositories, seed: ResearchSessionSeed) -> None:
    if seed == "projectless":
        return

    if seed in {"needs_baseline", "with_baseline_result", "with_promising_results"}:
        await repos.hypotheses.create(
            hypothesis_id=HYPOTHESIS_ID,
            project_id=PROJECT_ID,
            created_in_session_id=SESSION_ID,
            title="Component changes can improve score",
            summary="Compare baseline, individual components, and simple combinations.",
            status="active",
        )

    if seed in {"with_baseline_result", "with_promising_results"}:
        await _create_baseline_measurement(
            repos,
            result_body="Baseline completed: score 0.710, latency_ms 120, tests_passed true.",
            metrics={"score": 0.710, "latency_ms": 120, "tests_passed": True},
        )

    if seed == "with_promising_results":
        await _create_experiment_with_result(
            repos,
            experiment_id=COMPONENT_A_EXPERIMENT_ID,
            title="Try component A",
            summary="Run baseline plus component A.",
            result_body="Component A completed: score 0.734, latency_ms 123, tests_passed true.",
            signals={"score": 0.734, "latency_ms": 123, "tests_passed": True},
        )
        await _create_experiment_with_result(
            repos,
            experiment_id=COMPONENT_C_EXPERIMENT_ID,
            title="Try component C",
            summary="Run baseline plus component C.",
            result_body="Component C completed: score 0.748, latency_ms 126, tests_passed true.",
            signals={"score": 0.748, "latency_ms": 126, "tests_passed": True},
        )
        await repos.hypothesis_experiment_links.create(
            hypothesis_id=HYPOTHESIS_ID,
            experiment_id=COMPONENT_A_EXPERIMENT_ID,
        )
        await repos.hypothesis_experiment_links.create(
            hypothesis_id=HYPOTHESIS_ID,
            experiment_id=COMPONENT_C_EXPERIMENT_ID,
        )
        await repos.hypothesis_activities.add(
            hypothesis_id=HYPOTHESIS_ID,
            actor="harness",
            kind="comment",
            body="A and C are the strongest individual components so far.",
            payload={"activity_type": "interpretation"},
        )

    if seed in {
        "with_hypothesis",
        "with_experiment",
        "with_link",
        "with_comments",
        "with_artifact",
    }:
        await repos.hypotheses.create(
            hypothesis_id=HYPOTHESIS_ID,
            project_id=PROJECT_ID,
            created_in_session_id=SESSION_ID,
            title="Component A helps",
            summary="Component A may improve validation score.",
            status="active",
        )

    if seed in {"with_experiment", "with_link", "with_comments", "with_artifact"}:
        await repos.experiments.create(
            experiment_id=EXPERIMENT_ID,
            project_id=PROJECT_ID,
            created_in_session_id=SESSION_ID,
            title="Try component A",
            summary="Run baseline plus component A.",
            status="open",
        )

    if seed in {"with_link", "with_comments", "with_artifact"}:
        await repos.hypothesis_experiment_links.create(
            hypothesis_id=HYPOTHESIS_ID,
            experiment_id=EXPERIMENT_ID,
        )

    if seed in {"with_comments", "with_artifact"}:
        await repos.hypothesis_activities.add(
            hypothesis_id=HYPOTHESIS_ID,
            actor="agent",
            kind="comment",
            body="Component A is worth testing before combining variants.",
        )
        await repos.experiment_activities.add(
            experiment_id=EXPERIMENT_ID,
            actor="worker",
            kind="comment",
            body="Component A completed with score 0.73.",
        )

    if seed == "with_artifact":
        await repos.artifacts.create(
            artifact_id=ARTIFACT_ID,
            project_id=PROJECT_ID,
            created_in_session_id=SESSION_ID,
            associated_entity_kind="experiment",
            associated_entity_id=EXPERIMENT_ID,
            kind="json",
            title="component A raw eval output",
            path="artifacts/component-a.json",
            media_type="application/json",
            size_bytes=128,
        )

    if seed == "with_task":
        await repos.tasks.create(
            task_id=TASK_ID,
            project_id=PROJECT_ID,
            created_in_session_id=SESSION_ID,
            title="Establish baseline metrics",
            content="Run the baseline command and record score and latency.",
            kind="baseline",
            priority="high",
            source_kind="manager",
            payload={"focus": "baseline score and latency"},
        )


async def _create_experiment_with_result(
    repos: Repositories,
    *,
    experiment_id: str,
    title: str,
    summary: str,
    result_body: str,
    signals: dict[str, int | float | str | bool | None],
) -> None:
    await repos.experiments.create(
        experiment_id=experiment_id,
        project_id=PROJECT_ID,
        created_in_session_id=SESSION_ID,
        title=title,
        summary=summary,
        status="closed",
    )
    evaluation_id = _evaluation_id_for_experiment(experiment_id)
    await repos.evaluations.create(
        evaluation_id=evaluation_id,
        project_id=PROJECT_ID,
        created_in_session_id=SESSION_ID,
        title=f"{title} evaluation",
        summary=f"Measurement evidence for {title}.",
        associated_experiment_id=experiment_id,
        status="closed",
    )
    await repos.measurements.add(
        evaluation_id=evaluation_id,
        created_in_session_id=SESSION_ID,
        actor="worker",
        body=result_body,
        payload={
            "metrics": _metric_values(signals),
            "signals": [
                {"key": key, "value": value}
                for key, value in signals.items()
            ],
            "raw": {"shape": "standard"},
        },
    )
    await repos.evaluation_activities.add(
        evaluation_id=evaluation_id,
        created_in_session_id=SESSION_ID,
        actor="worker",
        kind="result",
        body=result_body,
        payload={
            "metrics": _metric_values(signals),
            "signals": [
                {"key": key, "value": value}
                for key, value in signals.items()
            ],
            "raw": {"shape": "standard"},
        },
    )
    await repos.experiment_activities.add(
        experiment_id=experiment_id,
        actor="worker",
        kind="comment",
        body=result_body,
        payload={
            "activity_type": "result",
            "signals": [
                {"key": key, "value": value}
                for key, value in signals.items()
            ],
            "raw": {"shape": "standard"},
        },
    )


async def _create_baseline_measurement(
    repos: Repositories,
    *,
    result_body: str,
    metrics: dict[str, int | float | str | bool | None],
) -> None:
    baseline = await repos.baselines.create(
        baseline_id=BASELINE_ID,
        project_id=PROJECT_ID,
        created_in_session_id=SESSION_ID,
        title="Default baseline",
        summary="Reference validation run before candidate variants.",
        status="closed",
    )
    await repos.evaluations.create(
        evaluation_id=BASELINE_EVALUATION_ID,
        project_id=PROJECT_ID,
        created_in_session_id=SESSION_ID,
        title="Baseline evaluation",
        summary="Measurement evidence for the default baseline.",
        associated_baseline_id=baseline.id,
        status="closed",
    )
    await repos.measurements.add(
        evaluation_id=BASELINE_EVALUATION_ID,
        created_in_session_id=SESSION_ID,
        actor="worker",
        body=result_body,
        payload={
            "metrics": _metric_values(metrics),
            "raw": {"shape": "standard"},
        },
    )
    await repos.evaluation_activities.add(
        evaluation_id=BASELINE_EVALUATION_ID,
        created_in_session_id=SESSION_ID,
        actor="worker",
        kind="result",
        body=result_body,
        payload={
            "metrics": _metric_values(metrics),
            "raw": {"shape": "standard"},
        },
    )


def _evaluation_id_for_experiment(experiment_id: str) -> str:
    if experiment_id == COMPONENT_A_EXPERIMENT_ID:
        return "EV2"
    if experiment_id == COMPONENT_C_EXPERIMENT_ID:
        return "EV3"
    raise ValueError(f"unknown eval fixture experiment id: {experiment_id}")


def _metric_values(
    signals: dict[str, int | float | str | bool | None],
) -> dict[str, int | float | str | bool]:
    return {key: value for key, value in signals.items() if value is not None}


def _seed_dirty_workspace(repo_path: Path) -> None:
    _git(repo_path, "init")
    _git(repo_path, "config", "user.email", "situ@example.com")
    _git(repo_path, "config", "user.name", "Situ")
    (repo_path / "train.py").write_text("COMPONENT = 'baseline'\n", encoding="utf-8")
    (repo_path / "tests").mkdir()
    (repo_path / "tests" / "test_train.py").write_text(
        "def test_train(): pass\n",
        encoding="utf-8",
    )
    _git(repo_path, "add", ".")
    _git(repo_path, "commit", "-m", "baseline")

    (repo_path / "train.py").write_text("COMPONENT = 'component_a'\n", encoding="utf-8")
    (repo_path / "tests" / "test_train.py").write_text(
        "def test_train(): pass\ndef test_component_a(): pass\n",
        encoding="utf-8",
    )
    (repo_path / "pyproject.toml").write_text(
        "[project]\nname = 'situ-eval-world'\n",
        encoding="utf-8",
    )


def _git(repo_path: Path, *args: str) -> None:
    subprocess.run(
        ["git", *args],
        cwd=repo_path,
        check=True,
        capture_output=True,
        text=True,
    )
