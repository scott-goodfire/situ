from __future__ import annotations

from typing import Any

from pydantic_ai import RunContext

from ...common import AlmanacToolDeps, BaseAlmanacTool
from .models import GetResearchContextResult


class GetResearchContextTool(
    BaseAlmanacTool[AlmanacToolDeps, GetResearchContextResult]
):
    name = "get_research_context"
    result_type = GetResearchContextResult

    def execute_sync(
        self,
        *,
        ctx: RunContext[AlmanacToolDeps],
        **_kwargs: Any,
    ) -> GetResearchContextResult:
        """Load the research context for the current session."""
        repos = ctx.deps.get_repos()
        research_context = repos.research_contexts.get_for_session(ctx.deps.session_id)
        return GetResearchContextResult(
            success=True,
            research_context=research_context.model_dump() if research_context is not None else None,
        )
