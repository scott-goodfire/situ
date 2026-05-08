from __future__ import annotations

from typing import Any

from pydantic_ai import RunContext

from ...common import SituToolDeps, BaseSituTool
from .models import ListHypothesisActivitiesResult


class ListHypothesisActivitiesTool(
    BaseSituTool[SituToolDeps, ListHypothesisActivitiesResult]
):
    name = "list_hypothesis_activities"
    result_type = ListHypothesisActivitiesResult

    async def execute(
        self,
        *,
        ctx: RunContext[SituToolDeps],
        hypothesis_id: str | None = None,
        **_kwargs: Any,
    ) -> ListHypothesisActivitiesResult:
        """List hypothesis activity in the current project, optionally narrowed to one hypothesis."""
        repos = await ctx.deps.get_repos()
        if hypothesis_id is not None:
            activities = await repos.hypothesis_activities.list_for_hypothesis(
                hypothesis_id=hypothesis_id
            )
        else:
            resolved_project_id = await ctx.deps.current_project_id()
            activities = (
                await repos.hypothesis_activities.list_for_project(project_id=resolved_project_id)
                if resolved_project_id is not None
                else []
            )

        return ListHypothesisActivitiesResult(
            success=True,
            activities=[activity.model_dump() for activity in activities],
        )
