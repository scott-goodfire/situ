from __future__ import annotations

from typing import Any

from pydantic_ai import RunContext

from ....records import WorkStatus, parse_work_status
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
        status: WorkStatus | None = None,
        **_kwargs: Any,
    ) -> ListExperimentsResult:
        """List experiments by session or objective, defaulting to the current session."""
        checked_status = (
            parse_work_status(status=status, noun="experiment")
            if status is not None
            else None
        )
        repos = ctx.deps.get_repos()
        if session_id is not None:
            experiments = repos.experiments.list_for_session(session_id)
        elif objective_id is not None:
            experiments = repos.experiments.list_for_objective(objective_id)
        else:
            experiments = repos.experiments.list_for_session(ctx.deps.session_id)

        if checked_status is not None:
            experiments = [
                experiment
                for experiment in experiments
                if experiment.status == checked_status
            ]

        return ListExperimentsResult(
            success=True,
            experiments=[experiment.model_dump() for experiment in experiments],
        )
