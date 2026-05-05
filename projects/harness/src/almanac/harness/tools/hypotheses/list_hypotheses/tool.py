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
        session_id: str | None = None,
        objective_id: str | None = None,
        status: WorkStatus | None = None,
        **_kwargs: Any,
    ) -> ListHypothesesResult:
        """List hypotheses for a session, defaulting to the current session."""
        checked_status = (
            parse_work_status(status=status, noun="hypothesis")
            if status is not None
            else None
        )
        repos = ctx.deps.get_repos()
        if session_id is not None:
            hypotheses = repos.hypotheses.list_for_session(session_id)
        elif objective_id is not None:
            hypotheses = repos.hypotheses.list_for_objective(objective_id)
        else:
            hypotheses = repos.hypotheses.list_for_session(ctx.deps.session_id)
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
