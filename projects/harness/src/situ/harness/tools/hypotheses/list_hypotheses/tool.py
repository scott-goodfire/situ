from __future__ import annotations

from typing import Any

from pydantic_ai import RunContext

from ....records import RecordStatus, parse_record_status
from ...common import SituToolDeps, BaseSituTool
from .models import ListHypothesesResult


class ListHypothesesTool(BaseSituTool[SituToolDeps, ListHypothesesResult]):
    name = "list_hypotheses"
    result_type = ListHypothesesResult

    async def execute(
        self,
        *,
        ctx: RunContext[SituToolDeps],
        status: RecordStatus | None = None,
        **_kwargs: Any,
    ) -> ListHypothesesResult:
        """List hypotheses in the current project."""
        checked_status = (
            parse_record_status(status=status, noun="hypothesis")
            if status is not None
            else None
        )
        repos = await ctx.deps.get_repos()
        resolved_project_id = await ctx.deps.current_project_id()
        hypotheses = (
            await repos.hypotheses.list_for_project(project_id=resolved_project_id)
            if resolved_project_id is not None
            else []
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
