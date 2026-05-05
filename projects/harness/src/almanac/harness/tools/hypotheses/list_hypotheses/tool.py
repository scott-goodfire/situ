from __future__ import annotations

from typing import Any

from pydantic_ai import RunContext

from ....records import WorkStatus, parse_work_status
from ...common import AlmanacToolDeps, BaseAlmanacTool
from .models import ListHypothesesResult


class ListHypothesesTool(BaseAlmanacTool[AlmanacToolDeps, ListHypothesesResult]):
    name = "list_hypotheses"
    result_type = ListHypothesesResult

    def execute_sync(
        self,
        *,
        ctx: RunContext[AlmanacToolDeps],
        objective_id: str | None = None,
        status: WorkStatus | None = None,
        **_kwargs: Any,
    ) -> ListHypothesesResult:
        """List hypotheses for an objective, defaulting to the current session's objective."""
        checked_status = (
            parse_work_status(status=status, noun="hypothesis")
            if status is not None
            else None
        )
        repos = ctx.deps.get_repos()
        resolved_objective_id = objective_id
        if resolved_objective_id is None:
            session = repos.sessions.get(ctx.deps.session_id)
            resolved_objective_id = session.objective_id if session is not None else None

        hypotheses = (
            repos.hypotheses.list_for_objective(resolved_objective_id)
            if resolved_objective_id is not None
            else repos.hypotheses.list_all()
        )
        if checked_status is not None:
            hypotheses = [
                hypothesis
                for hypothesis in hypotheses
                if hypothesis.status == checked_status
            ]

        return ListHypothesesResult(
            success=True,
            hypotheses=[hypothesis.model_dump() for hypothesis in hypotheses],
        )
