from __future__ import annotations

from typing import Any

from pydantic_ai import RunContext

from ....records import WorkStatus
from ...common import BaseSituTool, SituToolDeps
from .models import UpdateAnalysisResult


class UpdateAnalysisTool(BaseSituTool[SituToolDeps, UpdateAnalysisResult]):
    name = "update_analysis"
    result_type = UpdateAnalysisResult
    sequential = True

    def execute_sync(
        self,
        *,
        ctx: RunContext[SituToolDeps],
        analysis_id: str,
        status: WorkStatus | None = None,
        title: str | None = None,
        summary: str | None = None,
        content: str | None = None,
        supersedes_analysis_id: str | None = None,
        **_kwargs: Any,
    ) -> UpdateAnalysisResult:
        """Update an analysis record; put discussion in analysis comments."""
        analysis = ctx.deps.get_repos().analyses.update(
            analysis_id=analysis_id,
            status=status,
            title=title,
            summary=summary,
            content=content,
            supersedes_analysis_id=supersedes_analysis_id,
        )
        if analysis is None:
            raise ValueError(f"analysis not found: {analysis_id}")

        event = ctx.deps.record_event(
            "analysis.updated",
            f"Updated analysis {analysis.id}",
            payload={"analysis_id": analysis.id},
        )
        ctx.deps.publish_record(analysis, event=event)
        return UpdateAnalysisResult(success=True, analysis=analysis.model_dump())
