from __future__ import annotations

from pathlib import Path
from tempfile import TemporaryDirectory
from typing import Any

from almanac.harness.api.sessions import SessionsService
from almanac.harness.core.db import Database
from almanac.harness.repositories import Repositories
from evals.harness.models import EvalEvent
from evals.worlds.research_session.models import ResearchSessionSeed

OBJECTIVE_ID = "objective_eval_0001"
SESSION_ID = "session_eval_0001"
HYPOTHESIS_ID = "hyp_eval_component_a"
EXPERIMENT_ID = "exp_eval_component_a"
ARTIFACT_ID = "artifact_eval_raw_output"
BASELINE_EXPERIMENT_ID = "exp_eval_baseline"
COMPONENT_A_EXPERIMENT_ID = "exp_eval_component_a"
COMPONENT_C_EXPERIMENT_ID = "exp_eval_component_c"


class ResearchSessionWorld:
    def __init__(self, *, seed: ResearchSessionSeed) -> None:
        self._tmp = TemporaryDirectory()
        self.path = Path(self._tmp.name)
        self.repos = _build_repos(self.path)
        self.events: list[EvalEvent] = []
        _seed(self.repos, seed)

    def teardown(self) -> None:
        self._tmp.cleanup()

    def emit_event(
        self,
        event_type: str,
        message: str,
        session_id: str | None,
        payload: dict[str, Any] | None,
    ) -> dict[str, Any]:
        record = self.repos.events.add(
            event_type=event_type,
            message=message,
            session_id=session_id,
            payload=payload or {},
        )
        event = EvalEvent(
            event_type=event_type,
            message=message,
            payload={"id": record.id, "session_id": session_id, **(payload or {})},
        )
        self.events.append(event)
        return record.model_dump()

    def session_graph(self) -> dict[str, Any]:
        graph = SessionsService(repos=self.repos).get_session(SESSION_ID)
        return {
            "config": graph.config.model_dump() if graph.config is not None else None,
            "session": graph.session.model_dump() if graph.session is not None else None,
            "objective": graph.objective.model_dump() if graph.objective is not None else None,
            "hypotheses": [item.model_dump() for item in graph.hypotheses],
            "experiments": [item.model_dump() for item in graph.experiments],
            "hypothesis_experiment_links": [
                item.model_dump() for item in graph.hypothesis_experiment_links
            ],
            "hypothesis_activities": [
                item.model_dump() for item in graph.hypothesis_activities
            ],
            "experiment_activities": [
                item.model_dump() for item in graph.experiment_activities
            ],
            "artifacts": [item.model_dump() for item in graph.artifacts],
            "events": [item.model_dump() for item in graph.events],
        }


def _build_repos(path: Path) -> Repositories:
    db = Database(
        path / "almanac.sqlite",
        project_id="project_eval",
        repo_path="/tmp/almanac-eval-project",
    )
    repos = Repositories.create(db)
    repos.project_config.set(
        research_context=(
            "Use local eval scripts and compare score, latency_ms, and safety notes. "
            "Expected signals: score, latency_ms, tests_passed. "
            "Scope: baseline, simple variants, and promising combinations."
        ),
    )
    repos.objectives.create(
        objective_id=OBJECTIVE_ID,
        title="Improve validation score",
        description="Improve validation score without worsening latency.",
    )
    repos.sessions.create(SESSION_ID, objective_id=OBJECTIVE_ID)
    return repos


def _seed(repos: Repositories, seed: ResearchSessionSeed) -> None:
    if seed in {"needs_baseline", "with_baseline_result", "with_promising_results"}:
        repos.hypotheses.create(
            hypothesis_id=HYPOTHESIS_ID,
            objective_id=OBJECTIVE_ID,
            title="Component changes can improve score",
            summary="Compare baseline, individual components, and simple combinations.",
            status="active",
            associated_session_id=SESSION_ID,
        )

    if seed in {"with_baseline_result", "with_promising_results"}:
        _create_experiment_with_result(
            repos,
            experiment_id=BASELINE_EXPERIMENT_ID,
            title="Record baseline",
            summary="Baseline validation run.",
            result_body="Baseline completed: score 0.710, latency_ms 120, tests_passed true.",
            signals={"score": 0.710, "latency_ms": 120, "tests_passed": True},
        )
        repos.hypothesis_experiment_links.create(
            hypothesis_id=HYPOTHESIS_ID,
            experiment_id=BASELINE_EXPERIMENT_ID,
        )

    if seed == "with_promising_results":
        _create_experiment_with_result(
            repos,
            experiment_id=COMPONENT_A_EXPERIMENT_ID,
            title="Try component A",
            summary="Run baseline plus component A.",
            result_body="Component A completed: score 0.734, latency_ms 123, tests_passed true.",
            signals={"score": 0.734, "latency_ms": 123, "tests_passed": True},
        )
        _create_experiment_with_result(
            repos,
            experiment_id=COMPONENT_C_EXPERIMENT_ID,
            title="Try component C",
            summary="Run baseline plus component C.",
            result_body="Component C completed: score 0.748, latency_ms 126, tests_passed true.",
            signals={"score": 0.748, "latency_ms": 126, "tests_passed": True},
        )
        repos.hypothesis_experiment_links.create(
            hypothesis_id=HYPOTHESIS_ID,
            experiment_id=COMPONENT_A_EXPERIMENT_ID,
        )
        repos.hypothesis_experiment_links.create(
            hypothesis_id=HYPOTHESIS_ID,
            experiment_id=COMPONENT_C_EXPERIMENT_ID,
        )
        repos.hypothesis_activities.add(
            hypothesis_id=HYPOTHESIS_ID,
            session_id=SESSION_ID,
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
        repos.hypotheses.create(
            hypothesis_id=HYPOTHESIS_ID,
            objective_id=OBJECTIVE_ID,
            title="Component A helps",
            summary="Component A may improve validation score.",
            status="active",
            associated_session_id=SESSION_ID,
        )

    if seed in {"with_experiment", "with_link", "with_comments", "with_artifact"}:
        repos.experiments.create(
            experiment_id=EXPERIMENT_ID,
            objective_id=OBJECTIVE_ID,
            title="Try component A",
            summary="Run baseline plus component A.",
            associated_session_id=SESSION_ID,
            status="open",
        )

    if seed in {"with_link", "with_comments", "with_artifact"}:
        repos.hypothesis_experiment_links.create(
            hypothesis_id=HYPOTHESIS_ID,
            experiment_id=EXPERIMENT_ID,
        )

    if seed in {"with_comments", "with_artifact"}:
        repos.hypothesis_activities.add(
            hypothesis_id=HYPOTHESIS_ID,
            session_id=SESSION_ID,
            actor="agent",
            kind="comment",
            body="Component A is worth testing before combining variants.",
        )
        repos.experiment_activities.add(
            experiment_id=EXPERIMENT_ID,
            session_id=SESSION_ID,
            actor="worker",
            kind="comment",
            body="Component A completed with score 0.73.",
        )

    if seed == "with_artifact":
        repos.artifacts.create(
            artifact_id=ARTIFACT_ID,
            objective_id=OBJECTIVE_ID,
            associated_session_id=SESSION_ID,
            associated_entity_kind="experiment",
            associated_entity_id=EXPERIMENT_ID,
            kind="json",
            title="component A raw eval output",
            path="artifacts/component-a.json",
            media_type="application/json",
            size_bytes=128,
        )


def _create_experiment_with_result(
    repos: Repositories,
    *,
    experiment_id: str,
    title: str,
    summary: str,
    result_body: str,
    signals: dict[str, int | float | str | bool | None],
) -> None:
    repos.experiments.create(
        experiment_id=experiment_id,
        objective_id=OBJECTIVE_ID,
        title=title,
        summary=summary,
        associated_session_id=SESSION_ID,
        status="closed",
    )
    repos.experiment_activities.add(
        experiment_id=experiment_id,
        session_id=SESSION_ID,
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
