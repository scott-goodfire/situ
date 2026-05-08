from __future__ import annotations

from typing import Any

from pydantic_ai import RunContext

from ....records import RecordStatus, parse_record_status
from ...common import BaseSituTool, SituToolDeps
from .models import ListBaselinesResult


class ListBaselinesTool(BaseSituTool[SituToolDeps, ListBaselinesResult]):
    name = "list_baselines"
    result_type = ListBaselinesResult

    async def execute(
        self,
        *,
        ctx: RunContext[SituToolDeps],
        status: RecordStatus | None = None,
        **_kwargs: Any,
    ) -> ListBaselinesResult:
        """List baselines in the current project."""
        checked_status = (
            parse_record_status(status=status, noun="baseline")
            if status is not None
            else None
        )
        repos = await ctx.deps.get_repos()
        resolved_project_id = await ctx.deps.current_project_id()
        baselines = (
            await repos.baselines.list_for_project(project_id=resolved_project_id)
            if resolved_project_id is not None
            else []
        )

        if checked_status is not None:
            baselines = [
                baseline
                for baseline in baselines
                if baseline.status == checked_status
            ]

        return ListBaselinesResult(
            success=True,
            baselines=[baseline.model_dump() for baseline in baselines],
        )
