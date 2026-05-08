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
from .models import AcceptAnalysisResult


class AcceptAnalysisTool(BaseSituTool[SituToolDeps, AcceptAnalysisResult]):
    name = "accept_analysis"
    result_type = AcceptAnalysisResult
    sequential = True

    async def execute(
        self,
        *,
        ctx: RunContext[SituToolDeps],
        analysis_id: str,
        comment: str | None = None,
        **_kwargs: Any,
    ) -> AcceptAnalysisResult:
        """Accept a triaged analysis (triage -> accepted).

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
        if analysis.status != RecordStatus.TRIAGE:
            return self._failure(
                code="invalid_status_transition",
                message=f"accept_analysis requires status 'triage', got '{analysis.status.value}'.",
            )
        updated = await repos.analyses.update(analysis_id=analysis_id, status=RecordStatus.ACCEPTED)
        if updated is None:
            return self._failure(code="update_failed", message=f"failed to update analysis: {analysis_id}")
        await repos.analysis_activities.add(
            analysis_id=analysis_id,
            created_in_session_id=ctx.deps.session_id,
            actor="agent",
            kind="status_updated",
            body="Status changed from triage to accepted.",
            payload={"from_status": "triage", "to_status": "accepted"},
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
            event_type="analysis.accepted",
            message=f"Accepted analysis {analysis_id}",
            payload={"analysis_id": analysis_id},
        )
        await ctx.deps.publish_record(record=updated, event=event)
        return AcceptAnalysisResult(success=True, analysis=updated.model_dump())
