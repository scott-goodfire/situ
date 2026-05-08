from __future__ import annotations

from typing import Any

from pydantic_ai import RunContext

from ....records import WorkStatus, parse_work_status
from ...common import BaseSituTool, SituToolDeps
from .models import ListAnalysesResult


class ListAnalysesTool(BaseSituTool[SituToolDeps, ListAnalysesResult]):
    name = "list_analyses"
    result_type = ListAnalysesResult

    async def execute(
        self,
        *,
        ctx: RunContext[SituToolDeps],
        project_id: str | None = None,
        status: WorkStatus | None = None,
        **_kwargs: Any,
    ) -> ListAnalysesResult:
        """List analyses for a project, defaulting to the current project."""
        checked_status = (
            parse_work_status(status=status, noun="analysis")
            if status is not None
            else None
        )
        repos = await ctx.deps.get_repos()
        resolved_project_id = project_id or await ctx.deps.current_project_id()
        analyses = (
            await repos.analyses.list_for_project(project_id=resolved_project_id)
            if resolved_project_id is not None
            else []
        )

        if checked_status is not None:
            analyses = [
                analysis for analysis in analyses if analysis.status == checked_status
            ]

        return ListAnalysesResult(
            success=True,
            analyses=[analysis.model_dump() for analysis in analyses],
        )
