from __future__ import annotations

from pydantic_ai import RunContext

from ..common import AlmanacToolDeps, BaseAlmanacTool
from .models import FindingConfidence, FindingStatus, RecordFindingResult


class RecordFindingTool(BaseAlmanacTool[AlmanacToolDeps, RecordFindingResult]):
    name = "record_finding"
    result_type = RecordFindingResult

    def execute_sync(
        self,
        *,
        ctx: RunContext[AlmanacToolDeps],
        summary: str,
        evidence_experiment_ids: list[str] | None = None,
        confidence: FindingConfidence = "low",
        status: FindingStatus = "open",
        finding_id: str | None = None,
    ) -> RecordFindingResult:
        resolved_finding_id = finding_id or (
            f"{ctx.deps.run_id}_agent_F-"
            f"{len(ctx.deps.repos.findings.list_for_run(ctx.deps.run_id)) + 1:03d}"
        )
        finding = ctx.deps.repos.findings.upsert(
            finding_id=resolved_finding_id,
            run_id=ctx.deps.run_id,
            summary=summary,
            evidence_experiment_ids=evidence_experiment_ids or [],
            confidence=confidence,
            status=status,
        )
        ctx.deps.record_event(
            "finding.recorded",
            summary,
            payload={"finding_id": finding["id"], "confidence": finding["confidence"]},
        )
        return RecordFindingResult(success=True, finding=finding)
