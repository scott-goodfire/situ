from __future__ import annotations

from typing import Any

from pydantic_ai import RunContext

from ...common import AlmanacToolDeps, BaseAlmanacTool
from .models import GetObjectiveResult


class GetObjectiveTool(BaseAlmanacTool[AlmanacToolDeps, GetObjectiveResult]):
    name = "get_objective"
    result_type = GetObjectiveResult

    def execute_sync(
        self,
        *,
        ctx: RunContext[AlmanacToolDeps],
        objective_id: str | None = None,
        **_kwargs: Any,
    ) -> GetObjectiveResult:
        """Load an objective by ID, or the objective for the current session."""
        resolved_objective_id = objective_id
        if resolved_objective_id is None:
            session = ctx.deps.repos.sessions.get(ctx.deps.session_id)
            resolved_objective_id = session.objective_id if session is not None else None

        objective = (
            ctx.deps.repos.objectives.get(resolved_objective_id)
            if resolved_objective_id is not None
            else None
        )
        return GetObjectiveResult(
            success=True,
            objective=objective.model_dump() if objective is not None else None,
        )
