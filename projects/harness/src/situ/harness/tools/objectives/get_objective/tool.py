from __future__ import annotations

from typing import Any

from pydantic_ai import RunContext

from ...common import SituToolDeps, BaseSituTool
from .models import GetObjectiveResult


class GetObjectiveTool(BaseSituTool[SituToolDeps, GetObjectiveResult]):
    name = "get_objective"
    result_type = GetObjectiveResult

    def execute_sync(
        self,
        *,
        ctx: RunContext[SituToolDeps],
        **_kwargs: Any,
    ) -> GetObjectiveResult:
        """Load the objective for the current session."""
        repos = ctx.deps.get_repos()
        objective = repos.objectives.get_for_session(ctx.deps.session_id)
        return GetObjectiveResult(
            success=True,
            objective=objective.model_dump() if objective is not None else None,
        )
