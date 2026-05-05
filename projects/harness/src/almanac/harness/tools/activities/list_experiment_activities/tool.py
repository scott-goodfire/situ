from __future__ import annotations

from typing import Any

from pydantic_ai import RunContext

from ...common import AlmanacToolDeps, BaseAlmanacTool
from .models import ListExperimentActivitiesResult


class ListExperimentActivitiesTool(
    BaseAlmanacTool[AlmanacToolDeps, ListExperimentActivitiesResult]
):
    name = "list_experiment_activities"
    result_type = ListExperimentActivitiesResult

    def execute_sync(
        self,
        *,
        ctx: RunContext[AlmanacToolDeps],
        experiment_id: str | None = None,
        session_id: str | None = None,
        **_kwargs: Any,
    ) -> ListExperimentActivitiesResult:
        """List experiment activity by experiment or session."""
        if experiment_id is not None:
            activities = ctx.deps.repos.experiment_activities.list_for_experiment(
                experiment_id
            )
        else:
            activities = ctx.deps.repos.experiment_activities.list_for_session(
                session_id or ctx.deps.session_id
            )

        return ListExperimentActivitiesResult(
            success=True,
            activities=[activity.model_dump() for activity in activities],
        )
