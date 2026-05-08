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
from .models import CancelAnalysisResult

_TERMINAL = {RecordStatus.DONE, RecordStatus.CANCELED, RecordStatus.FAILED}


class CancelAnalysisTool(BaseSituTool[SituToolDeps, CancelAnalysisResult]):
    name = "cancel_analysis"
    result_type = CancelAnalysisResult
    sequential = True

    async def execute(
        self,
        *,
        ctx: RunContext[SituToolDeps],
        analysis_id: str,
        comment: str | None = None,
        **_kwargs: Any,
    ) -> CancelAnalysisResult:
        """Cancel a non-terminal analysis (any non-terminal -> canceled).

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
        if analysis.status in _TERMINAL:
            return self._failure(
                code="invalid_status_transition",
                message=f"cancel_analysis cannot cancel an analysis already in terminal status '{analysis.status.value}'.",
            )
        from_status = analysis.status.value
        updated = await repos.analyses.update(analysis_id=analysis_id, status=RecordStatus.CANCELED)
        if updated is None:
            return self._failure(code="update_failed", message=f"failed to update analysis: {analysis_id}")
        await repos.analysis_activities.add(
            analysis_id=analysis_id,
            created_in_session_id=ctx.deps.session_id,
            actor="agent",
            kind="status_updated",
            body=f"Status changed from {from_status} to canceled.",
            payload={"from_status": from_status, "to_status": "canceled"},
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
            event_type="analysis.canceled",
            message=f"Canceled analysis {analysis_id}",
            payload={"analysis_id": analysis_id},
        )
        await ctx.deps.publish_record(record=updated, event=event)
        return CancelAnalysisResult(success=True, analysis=updated.model_dump())
