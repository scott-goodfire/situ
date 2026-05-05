from __future__ import annotations

from typing import Any

from pydantic_ai import RunContext

from ...common import AlmanacToolDeps, BaseAlmanacTool
from .models import CreateExperimentResult


class CreateExperimentTool(BaseAlmanacTool[AlmanacToolDeps, CreateExperimentResult]):
    name = "create_experiment"
    result_type = CreateExperimentResult
    sequential = True

    def execute_sync(
        self,
        *,
        ctx: RunContext[AlmanacToolDeps],
        title: str,
        summary: str,
        objective_id: str | None = None,
        session_id: str | None = None,
        experiment_id: str | None = None,
        status: str = "open",
        **_kwargs: Any,
    ) -> CreateExperimentResult:
        """Create an experiment under an objective and optional session."""
        repos = ctx.deps.get_repos()
        resolved_session_id = session_id or ctx.deps.session_id
        resolved_objective_id = objective_id or _current_objective_id(
            repos=repos,
            session_id=resolved_session_id,
        )
        if resolved_objective_id is None:
            raise ValueError("objective_id is required when there is no current session objective")

        resolved_experiment_id = experiment_id or _next_experiment_id(
            repos=repos,
            session_id=resolved_session_id,
        )
        experiment = repos.experiments.create(
            experiment_id=resolved_experiment_id,
            objective_id=resolved_objective_id,
            title=title,
            summary=summary,
            associated_session_id=resolved_session_id,
            status=status,
        )
        event = ctx.deps.record_event(
            "experiment.created",
            f"Created experiment {experiment.id}",
            payload={"experiment_id": experiment.id},
        )
        ctx.deps.publish_record(experiment, event=event)
        return CreateExperimentResult(success=True, experiment=experiment.model_dump())


def _current_objective_id(
    *,
    repos: Any,
    session_id: str,
) -> str | None:
    session = repos.sessions.get(session_id)
    return session.objective_id if session is not None else None


def _next_experiment_id(
    *,
    repos: Any,
    session_id: str,
) -> str:
    count = len(repos.experiments.list_for_session(session_id)) + 1
    return f"exp_{session_id}_agent_{count:03d}"
