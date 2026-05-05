from __future__ import annotations

from typing import Any

from pydantic_ai import RunContext

from ....records import ObjectiveStatus
from ...common import AlmanacToolDeps, BaseAlmanacTool
from .models import CreateObjectiveResult


class CreateObjectiveTool(BaseAlmanacTool[AlmanacToolDeps, CreateObjectiveResult]):
    name = "create_objective"
    result_type = CreateObjectiveResult
    sequential = True

    def execute_sync(
        self,
        *,
        ctx: RunContext[AlmanacToolDeps],
        title: str,
        description: str,
        status: ObjectiveStatus = ObjectiveStatus.ACTIVE,
        **_kwargs: Any,
    ) -> CreateObjectiveResult:
        """Create the objective for the current session.

        Each session has exactly one objective. Call this on session kickoff
        to record the session's north star from the free-text setup input.
        """
        repos = ctx.deps.get_repos()
        session_id = ctx.deps.session_id
        existing = repos.objectives.get_for_session(session_id)
        if existing is not None:
            return CreateObjectiveResult(success=True, objective=existing.model_dump())

        objective_id = f"obj_{session_id}"
        objective = repos.objectives.create(
            objective_id=objective_id,
            session_id=session_id,
            title=title,
            description=description,
            status=status,
        )
        event = ctx.deps.record_event(
            "objective.created",
            f"Created objective {objective.id}",
            payload={"objective_id": objective.id},
        )
        ctx.deps.publish_record(objective, event=event)
        return CreateObjectiveResult(success=True, objective=objective.model_dump())
