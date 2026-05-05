from __future__ import annotations

from typing import Any

from pydantic_ai import RunContext

from ...common import SituToolDeps, BaseSituTool
from .models import CreateResearchContextResult


class CreateResearchContextTool(
    BaseSituTool[SituToolDeps, CreateResearchContextResult]
):
    name = "create_research_context"
    result_type = CreateResearchContextResult
    sequential = True

    def execute_sync(
        self,
        *,
        ctx: RunContext[SituToolDeps],
        body: str,
        **_kwargs: Any,
    ) -> CreateResearchContextResult:
        """Create the research context for the current session.

        Each session has exactly one research context. Call this on session
        kickoff to record how progress is judged from the free-text setup
        input: eval commands, signals, dashboards, scope, and what to treat
        as suspicious.
        """
        repos = ctx.deps.get_repos()
        session_id = ctx.deps.session_id
        existing = repos.research_contexts.get_for_session(session_id)
        if existing is not None:
            return CreateResearchContextResult(
                success=True,
                research_context=existing.model_dump(),
            )

        research_context_id = f"rctx_{session_id}"
        research_context = repos.research_contexts.create(
            research_context_id=research_context_id,
            session_id=session_id,
            body=body,
        )
        event = ctx.deps.record_event(
            "research_context.created",
            f"Created research context {research_context.id}",
            payload={"research_context_id": research_context.id},
        )
        ctx.deps.publish_record(research_context, event=event)
        return CreateResearchContextResult(
            success=True,
            research_context=research_context.model_dump(),
        )
