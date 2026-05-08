from __future__ import annotations

from typing import Any

from pydantic_ai import RunContext

from ...common import BaseSituTool, SituToolDeps
from .models import ListBaselineActivitiesResult


class ListBaselineActivitiesTool(
    BaseSituTool[SituToolDeps, ListBaselineActivitiesResult]
):
    name = "list_baseline_activities"
    result_type = ListBaselineActivitiesResult

    async def execute(
        self,
        *,
        ctx: RunContext[SituToolDeps],
        baseline_id: str | None = None,
        **_kwargs: Any,
    ) -> ListBaselineActivitiesResult:
        """List baseline activity in the current project, optionally narrowed to one baseline."""
        repos = await ctx.deps.get_repos()
        if baseline_id is not None:
            activities = await repos.baseline_activities.list_for_baseline(
                baseline_id=baseline_id
            )
        else:
            resolved_project_id = await ctx.deps.current_project_id()
            activities = (
                await repos.baseline_activities.list_for_project(project_id=resolved_project_id)
                if resolved_project_id is not None
                else []
            )

        return ListBaselineActivitiesResult(
            success=True,
            activities=[activity.model_dump() for activity in activities],
        )
