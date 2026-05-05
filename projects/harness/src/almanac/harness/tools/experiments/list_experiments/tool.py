from __future__ import annotations

from typing import Any

from pydantic_ai import RunContext

from ...common import AlmanacToolDeps, BaseAlmanacTool
from .models import ListExperimentsResult


class ListExperimentsTool(BaseAlmanacTool[AlmanacToolDeps, ListExperimentsResult]):
    name = "list_experiments"
    result_type = ListExperimentsResult

    def execute_sync(
        self,
        *,
        ctx: RunContext[AlmanacToolDeps],
        session_id: str | None = None,
        objective_id: str | None = None,
        status: str | None = None,
        **_kwargs: Any,
    ) -> ListExperimentsResult:
        """List experiments by session or objective, defaulting to the current session."""
        if session_id is not None:
            experiments = ctx.deps.repos.experiments.list_for_session(session_id)
        elif objective_id is not None:
            experiments = ctx.deps.repos.experiments.list_for_objective(objective_id)
        else:
            experiments = ctx.deps.repos.experiments.list_for_session(ctx.deps.session_id)

        if status is not None:
            experiments = [experiment for experiment in experiments if experiment.status == status]

        return ListExperimentsResult(
            success=True,
            experiments=[experiment.model_dump() for experiment in experiments],
        )
