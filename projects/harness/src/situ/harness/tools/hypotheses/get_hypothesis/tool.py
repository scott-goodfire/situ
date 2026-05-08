from __future__ import annotations

from typing import Any

from pydantic_ai import RunContext

from ...common import BaseSituTool, SituToolDeps
from .models import GetHypothesisResult


class GetHypothesisTool(BaseSituTool[SituToolDeps, GetHypothesisResult]):
    name = "get_hypothesis"
    result_type = GetHypothesisResult

    async def execute(
        self,
        *,
        ctx: RunContext[SituToolDeps],
        hypothesis_id: str,
        **_kwargs: Any,
    ) -> GetHypothesisResult:
        """Read a hypothesis record by id."""
        repos = await ctx.deps.get_repos()
        hypothesis = await repos.hypotheses.get(hypothesis_id=hypothesis_id)
        if hypothesis is None:
            return self._failure(
                code="hypothesis_not_found",
                message=f"Hypothesis '{hypothesis_id}' was not found.",
            )
        return GetHypothesisResult(
            success=True,
            hypothesis=hypothesis.model_dump(),
        )
