from __future__ import annotations

from typing import Any

from pydantic_ai import RunContext

from ....records import WorkStatus, parse_work_status
from ...common import SituToolDeps, BaseSituTool
from .models import ListHypothesesResult


class ListHypothesesTool(BaseSituTool[SituToolDeps, ListHypothesesResult]):
    name = "list_hypotheses"
    result_type = ListHypothesesResult

    def execute_sync(
        self,
        *,
        ctx: RunContext[SituToolDeps],
        session_id: str | None = None,
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
        target_session_id = session_id or ctx.deps.session_id
        hypotheses = repos.hypotheses.list_for_session(target_session_id)
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
