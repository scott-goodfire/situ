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

    def execute_sync(
        self,
        *,
        ctx: RunContext[SituToolDeps],
        analysis_id: str | None = None,
        session_id: str | None = None,
        **_kwargs: Any,
    ) -> ListAnalysisActivitiesResult:
        """List analysis activity by analysis or session."""
        repos = ctx.deps.get_repos()
        if analysis_id is not None:
            activities = repos.analysis_activities.list_for_analysis(analysis_id)
        else:
            activities = repos.analysis_activities.list_for_session(
                session_id or ctx.deps.session_id
            )

        return ListAnalysisActivitiesResult(
            success=True,
            activities=[activity.model_dump() for activity in activities],
        )
