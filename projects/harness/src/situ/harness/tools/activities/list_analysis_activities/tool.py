from __future__ import annotations

from typing import Any

from pydantic_ai import RunContext

from ...common import BaseSituTool, SituToolDeps
from .models import ListAnalysisActivitiesResult


class ListAnalysisActivitiesTool(
    BaseSituTool[SituToolDeps, ListAnalysisActivitiesResult]
):
    name = "list_analysis_activities"
    result_type = ListAnalysisActivitiesResult

    async def execute(
        self,
        *,
        ctx: RunContext[SituToolDeps],
        analysis_id: str | None = None,
        project_id: str | None = None,
        **_kwargs: Any,
    ) -> ListAnalysisActivitiesResult:
        """List analysis activity by analysis or project."""
        repos = await ctx.deps.get_repos()
        if analysis_id is not None:
            activities = await repos.analysis_activities.list_for_analysis(analysis_id=analysis_id)
        else:
            resolved_project_id = project_id or await ctx.deps.current_project_id()
            activities = (
                await repos.analysis_activities.list_for_project(project_id=resolved_project_id)
                if resolved_project_id is not None
                else []
            )

        return ListAnalysisActivitiesResult(
            success=True,
            activities=[activity.model_dump() for activity in activities],
        )
