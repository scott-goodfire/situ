from __future__ import annotations

from typing import Any

from pydantic_ai import RunContext

from ...common import SituToolDeps, BaseSituTool
from .models import ListExperimentActivitiesResult


class ListExperimentActivitiesTool(
    BaseSituTool[SituToolDeps, ListExperimentActivitiesResult]
):
    name = "list_experiment_activities"
    result_type = ListExperimentActivitiesResult

    async def execute(
        self,
        *,
        ctx: RunContext[SituToolDeps],
        experiment_id: str | None = None,
        **_kwargs: Any,
    ) -> ListExperimentActivitiesResult:
        """List experiment activity in the current project, optionally narrowed to one experiment."""
        repos = await ctx.deps.get_repos()
        if experiment_id is not None:
            activities = await repos.experiment_activities.list_for_experiment(
                experiment_id=experiment_id
            )
        else:
            resolved_project_id = await ctx.deps.current_project_id()
            activities = (
                await repos.experiment_activities.list_for_project(project_id=resolved_project_id)
                if resolved_project_id is not None
                else []
            )

        return ListExperimentActivitiesResult(
            success=True,
            activities=[activity.model_dump() for activity in activities],
        )
