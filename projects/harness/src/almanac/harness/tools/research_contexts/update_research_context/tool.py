from __future__ import annotations

from typing import Any

from pydantic_ai import RunContext

from ...common import AlmanacToolDeps, BaseAlmanacTool
from .models import UpdateResearchContextResult


class UpdateResearchContextTool(
    BaseAlmanacTool[AlmanacToolDeps, UpdateResearchContextResult]
):
    name = "update_research_context"
    result_type = UpdateResearchContextResult
    sequential = True

    def execute_sync(
        self,
        *,
        ctx: RunContext[AlmanacToolDeps],
        body: str,
        **_kwargs: Any,
    ) -> UpdateResearchContextResult:
        """Update the research context for the current session."""
        repos = ctx.deps.get_repos()
        current = repos.research_contexts.get_for_session(ctx.deps.session_id)
        if current is None:
            raise ValueError(
                "no research context exists for the current session yet"
            )

        research_context = repos.research_contexts.update(current.id, body=body)
        if research_context is None:
            raise RuntimeError(
                f"research context disappeared during update: {current.id}"
            )
        event = ctx.deps.record_event(
            "research_context.updated",
            f"Updated research context {research_context.id}",
            payload={"research_context_id": research_context.id},
        )
        ctx.deps.publish_record(research_context, event=event)
        return UpdateResearchContextResult(
            success=True,
            research_context=research_context.model_dump(),
        )
