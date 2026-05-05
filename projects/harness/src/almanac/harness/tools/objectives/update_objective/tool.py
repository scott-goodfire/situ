from __future__ import annotations

from typing import Any

from pydantic_ai import RunContext

from ....records import ObjectiveStatus
from ...common import AlmanacToolDeps, BaseAlmanacTool
from .models import UpdateObjectiveResult


class UpdateObjectiveTool(BaseAlmanacTool[AlmanacToolDeps, UpdateObjectiveResult]):
    name = "update_objective"
    result_type = UpdateObjectiveResult
    sequential = True

    def execute_sync(
        self,
        *,
        ctx: RunContext[AlmanacToolDeps],
        title: str | None = None,
        description: str | None = None,
        status: ObjectiveStatus | None = None,
        **_kwargs: Any,
    ) -> UpdateObjectiveResult:
        """Update the objective for the current session."""
        repos = ctx.deps.get_repos()
        current = repos.objectives.get_for_session(ctx.deps.session_id)
        if current is None:
            raise ValueError("no objective exists for the current session yet")

        objective = repos.objectives.update(
            current.id,
            title=title,
            description=description,
            status=status,
        )
        if objective is None:
            raise RuntimeError(f"objective disappeared during update: {current.id}")
        event = ctx.deps.record_event(
            "objective.updated",
            f"Updated objective {objective.id}",
            payload={"objective_id": objective.id},
        )
        ctx.deps.publish_record(objective, event=event)
        return UpdateObjectiveResult(success=True, objective=objective.model_dump())
