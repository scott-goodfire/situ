from __future__ import annotations

from typing import Any

from pydantic_ai import RunContext

from ....records import RecordStatus
from ...common import (
    BaseSituTool,
    ReviewTargetKind,
    SituToolDeps,
    ensure_active_review_target,
)
from .models import CompleteAnalysisResult


class CompleteAnalysisTool(BaseSituTool[SituToolDeps, CompleteAnalysisResult]):
    name = "complete_analysis"
    result_type = CompleteAnalysisResult
    sequential = True

    async def execute(
        self,
        *,
        ctx: RunContext[SituToolDeps],
        analysis_id: str,
        comment: str | None = None,
        **_kwargs: Any,
    ) -> CompleteAnalysisResult:
        """Mark an active analysis as done (active -> done).

        Records a `status_updated` activity and optionally a `comment`.
        """
        ensure_active_review_target(
            ctx=ctx,
            kind=ReviewTargetKind.ANALYSIS,
            record_id=analysis_id,
        )
        repos = await ctx.deps.get_repos()
        analysis = await repos.analyses.get(analysis_id=analysis_id)
        if analysis is None:
            return self._failure(code="analysis_not_found", message=f"analysis not found: {analysis_id}")
        if analysis.status != RecordStatus.ACTIVE:
            return self._failure(
                code="invalid_status_transition",
                message=f"complete_analysis requires status 'active', got '{analysis.status.value}'.",
            )
        updated = await repos.analyses.update(analysis_id=analysis_id, status=RecordStatus.DONE)
        if updated is None:
            return self._failure(code="update_failed", message=f"failed to update analysis: {analysis_id}")
        await repos.analysis_activities.add(
            analysis_id=analysis_id,
            created_in_session_id=ctx.deps.session_id,
            actor="agent",
            kind="status_updated",
            body="Status changed from active to done.",
            payload={"from_status": "active", "to_status": "done"},
        )
        if comment:
            await repos.analysis_activities.add(
                analysis_id=analysis_id,
                created_in_session_id=ctx.deps.session_id,
                actor="agent",
                kind="comment",
                body=comment,
            )
        event = await ctx.deps.record_event(
            event_type="analysis.done",
            message=f"Completed analysis {analysis_id}",
            payload={"analysis_id": analysis_id},
        )
        await ctx.deps.publish_record(record=updated, event=event)
        return CompleteAnalysisResult(success=True, analysis=updated.model_dump())
