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
        status: WorkStatus | None = None,
        **_kwargs: Any,
    ) -> ListExperimentsResult:
        """List experiments for a session, defaulting to the current session."""
        checked_status = (
            parse_work_status(status=status, noun="experiment")
            if status is not None
            else None
        )
        repos = ctx.deps.get_repos()
        target_session_id = session_id or ctx.deps.session_id
        experiments = repos.experiments.list_for_session(target_session_id)

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
