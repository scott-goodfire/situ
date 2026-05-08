from __future__ import annotations

from pydantic_ai import RunContext

from ...records import EvaluationRecord, RecordStatus
from ..common import SituToolDeps


async def submit_active_baseline_evaluations(
    *,
    ctx: RunContext[SituToolDeps],
    baseline_id: str,
) -> list[EvaluationRecord]:
    return await _transition_baseline_evaluations(
        ctx=ctx,
        baseline_id=baseline_id,
        from_statuses={RecordStatus.ACTIVE},
        to_status=RecordStatus.IN_REVIEW,
        event_type="evaluation.in_review",
        event_message="Submitted baseline evaluation {evaluation_id} for review",
    )


async def complete_open_baseline_evaluations(
    *,
    ctx: RunContext[SituToolDeps],
    baseline_id: str,
) -> list[EvaluationRecord]:
    return await _transition_baseline_evaluations(
        ctx=ctx,
        baseline_id=baseline_id,
        from_statuses={RecordStatus.ACTIVE, RecordStatus.IN_REVIEW},
        to_status=RecordStatus.DONE,
        event_type="evaluation.done",
        event_message="Completed baseline evaluation {evaluation_id}",
    )


async def _transition_baseline_evaluations(
    *,
    ctx: RunContext[SituToolDeps],
    baseline_id: str,
    from_statuses: set[RecordStatus],
    to_status: RecordStatus,
    event_type: str,
    event_message: str,
) -> list[EvaluationRecord]:
    repos = await ctx.deps.get_repos()
    updated_records: list[EvaluationRecord] = []
    for evaluation in await repos.evaluations.list_for_baseline(
        baseline_id=baseline_id,
    ):
        if evaluation.status not in from_statuses:
            continue
        from_status = evaluation.status
        updated = await repos.evaluations.update(
            evaluation_id=evaluation.id,
            status=to_status,
        )
        if updated is None:
            continue
        await repos.evaluation_activities.add(
            evaluation_id=evaluation.id,
            created_in_session_id=ctx.deps.session_id,
            actor="agent",
            kind="status_updated",
            body=(
                f"Status changed from {from_status.value} to {to_status.value} "
                f"with baseline {baseline_id}."
            ),
            payload={
                "from_status": from_status.value,
                "to_status": to_status.value,
                "baseline_id": baseline_id,
            },
        )
        event = await ctx.deps.record_event(
            event_type=event_type,
            message=event_message.format(evaluation_id=evaluation.id),
            payload={
                "evaluation_id": evaluation.id,
                "baseline_id": baseline_id,
            },
        )
        await ctx.deps.publish_record(record=updated, event=event)
        updated_records.append(updated)
    return updated_records
