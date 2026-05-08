from __future__ import annotations

from typing import Any

from pydantic_ai import RunContext

from ...common import BaseSituTool, SituToolDeps
from .models import GetAnalysisResult


class GetAnalysisTool(BaseSituTool[SituToolDeps, GetAnalysisResult]):
    name = "get_analysis"
    result_type = GetAnalysisResult

    async def execute(
        self,
        *,
        ctx: RunContext[SituToolDeps],
        analysis_id: str,
        **_kwargs: Any,
    ) -> GetAnalysisResult:
        """Read an analysis record by id."""
        repos = await ctx.deps.get_repos()
        analysis = await repos.analyses.get(analysis_id=analysis_id)
        if analysis is None:
            return self._failure(
                code="analysis_not_found",
                message=f"Analysis '{analysis_id}' was not found.",
            )
        return GetAnalysisResult(
            success=True,
            analysis=analysis.model_dump(),
        )
