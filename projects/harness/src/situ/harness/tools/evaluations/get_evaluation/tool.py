from __future__ import annotations

from typing import Any

from pydantic_ai import RunContext

from ...common import BaseSituTool, SituToolDeps
from .models import GetEvaluationResult


class GetEvaluationTool(BaseSituTool[SituToolDeps, GetEvaluationResult]):
    name = "get_evaluation"
    result_type = GetEvaluationResult

    async def execute(
        self,
        *,
        ctx: RunContext[SituToolDeps],
        evaluation_id: str,
        **_kwargs: Any,
    ) -> GetEvaluationResult:
        """Read an evaluation record by id."""
        repos = await ctx.deps.get_repos()
        evaluation = await repos.evaluations.get(evaluation_id=evaluation_id)
        if evaluation is None:
            return self._failure(
                code="evaluation_not_found",
                message=f"Evaluation '{evaluation_id}' was not found.",
            )
        return GetEvaluationResult(
            success=True,
            evaluation=evaluation.model_dump(),
        )
