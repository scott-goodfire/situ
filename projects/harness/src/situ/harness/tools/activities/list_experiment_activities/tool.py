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

    def execute_sync(
        self,
        *,
        ctx: RunContext[SituToolDeps],
        experiment_id: str | None = None,
        session_id: str | None = None,
        **_kwargs: Any,
    ) -> ListExperimentActivitiesResult:
        """List experiment activity by experiment or session."""
        repos = ctx.deps.get_repos()
        if experiment_id is not None:
            activities = repos.experiment_activities.list_for_experiment(
                experiment_id
            )
        else:
            activities = repos.experiment_activities.list_for_session(
                session_id or ctx.deps.session_id
            )

        return ListExperimentActivitiesResult(
            success=True,
            activities=[activity.model_dump() for activity in activities],
        )
