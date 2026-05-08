from __future__ import annotations

from typing import Any

from pydantic_ai import RunContext

from ...common import BaseSituTool, SituToolDeps
from .models import GetBaselineResult


class GetBaselineTool(BaseSituTool[SituToolDeps, GetBaselineResult]):
    name = "get_baseline"
    result_type = GetBaselineResult

    async def execute(
        self,
        *,
        ctx: RunContext[SituToolDeps],
        baseline_id: str,
        **_kwargs: Any,
    ) -> GetBaselineResult:
        """Read a baseline record by id."""
        repos = await ctx.deps.get_repos()
        baseline = await repos.baselines.get(baseline_id=baseline_id)
        if baseline is None:
            return self._failure(
                code="baseline_not_found",
                message=f"Baseline '{baseline_id}' was not found.",
            )
        return GetBaselineResult(
            success=True,
            baseline=baseline.model_dump(),
        )
