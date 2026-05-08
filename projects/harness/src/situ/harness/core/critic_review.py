from __future__ import annotations

from dataclasses import dataclass
from typing import Iterable, Protocol

from ..records import RecordStatus, WorkItemPurpose, WorkItemRecord, WorkItemStatus
from ..repositories import Repositories


@dataclass(frozen=True, slots=True)
class PendingCriticRecord:
    kind: str
    record_id: str
    status: RecordStatus


@dataclass(frozen=True, slots=True)
class CriticReviewClaim:
    work_item: WorkItemRecord
    target: PendingCriticRecord


class _ReviewableRecord(Protocol):
    id: str
    status: RecordStatus


async def has_pending_critic_records(
    *,
    repos: Repositories,
    project_id: str,
) -> bool:
    return bool(
        await list_pending_critic_records(
            repos=repos,
            project_id=project_id,
            limit=1,
        )
    )


async def critic_review_drain_token(
    *,
    repos: Repositories,
    project_id: str,
) -> str:
    row = await repos.work_items.db.fetchone(
        """
        SELECT
          COUNT(*) AS completed_count,
          COALESCE(MAX(completed_at), 'none') AS latest_completed_at
        FROM work_items
        WHERE project_id = ?
          AND purpose = ?
          AND status = ?
        """,
        (
            project_id,
            WorkItemPurpose.CRITIC_REVIEW.value,
            WorkItemStatus.DONE.value,
        ),
    )
    completed_count = int(row["completed_count"]) if row is not None else 0
    latest_completed_at = row["latest_completed_at"] if row is not None else "none"
    return f"{completed_count}:{latest_completed_at}"


async def list_pending_critic_records(
    *,
    repos: Repositories,
    project_id: str,
    limit: int | None = None,
) -> list[PendingCriticRecord]:
    pending: list[PendingCriticRecord] = []

    _append_pending(
        pending=pending,
        kind="analysis",
        records=await repos.analyses.list_for_project(project_id=project_id),
        statuses={RecordStatus.TRIAGE},
        limit=limit,
    )
    if _reached_limit(records=pending, limit=limit):
        return pending

    _append_pending(
        pending=pending,
        kind="hypothesis",
        records=await repos.hypotheses.list_for_project(project_id=project_id),
        statuses={RecordStatus.TRIAGE},
        limit=limit,
    )
    if _reached_limit(records=pending, limit=limit):
        return pending

    _append_pending(
        pending=pending,
        kind="baseline",
        records=await repos.baselines.list_for_project(project_id=project_id),
        statuses={RecordStatus.TRIAGE, RecordStatus.IN_REVIEW},
        limit=limit,
    )
    if _reached_limit(records=pending, limit=limit):
        return pending

    _append_pending(
        pending=pending,
        kind="experiment",
        records=await repos.experiments.list_for_project(project_id=project_id),
        statuses={RecordStatus.TRIAGE, RecordStatus.IN_REVIEW},
        limit=limit,
    )
    if _reached_limit(records=pending, limit=limit):
        return pending

    _append_pending(
        pending=pending,
        kind="evaluation",
        records=await repos.evaluations.list_for_project(project_id=project_id),
        statuses={RecordStatus.TRIAGE, RecordStatus.IN_REVIEW},
        limit=limit,
    )
    return pending


async def sync_critic_review_work_items(
    *,
    repos: Repositories,
    project_id: str,
    session_id: str | None,
) -> list[WorkItemRecord]:
    pending_records = await list_pending_critic_records(
        repos=repos,
        project_id=project_id,
    )
    pending_keys = {(record.kind, record.record_id) for record in pending_records}
    work_items: list[WorkItemRecord] = []
    for record in pending_records:
        work_items.append(
            await repos.work_items.ensure_open(
                project_id=project_id,
                created_in_session_id=session_id,
                purpose=WorkItemPurpose.CRITIC_REVIEW,
                target_kind=record.kind,
                target_id=record.record_id,
                payload={"status": record.status.value},
            )
        )

    for item in await repos.work_items.list_open_for_project(
        project_id=project_id,
        purpose=WorkItemPurpose.CRITIC_REVIEW,
    ):
        if (item.target_kind, item.target_id) in pending_keys:
            continue
        await repos.work_items.finish(
            item_id=item.id,
            status=WorkItemStatus.DONE,
            payload={
                **item.payload,
                "completion_reason": "target_no_longer_pending",
            },
        )
    return work_items


async def claim_critic_review_work_item(
    *,
    repos: Repositories,
    project_id: str,
    session_id: str,
    owner_workflow_id: str,
    lease_seconds: int,
) -> CriticReviewClaim | None:
    await sync_critic_review_work_items(
        repos=repos,
        project_id=project_id,
        session_id=session_id,
    )
    work_item = await repos.work_items.claim_next(
        project_id=project_id,
        purpose=WorkItemPurpose.CRITIC_REVIEW,
        owner_workflow_id=owner_workflow_id,
        lease_seconds=lease_seconds,
    )
    if work_item is None:
        return None
    target = await pending_critic_record_for_work_item(
        repos=repos,
        project_id=project_id,
        work_item=work_item,
    )
    if target is None:
        await repos.work_items.finish(
            item_id=work_item.id,
            status=WorkItemStatus.DONE,
            owner_workflow_id=work_item.owner_workflow_id,
            payload={
                **work_item.payload,
                "completion_reason": "target_no_longer_pending",
            },
        )
        return None
    return CriticReviewClaim(work_item=work_item, target=target)


async def pending_critic_record_for_work_item(
    *,
    repos: Repositories,
    project_id: str,
    work_item: WorkItemRecord,
) -> PendingCriticRecord | None:
    for record in await list_pending_critic_records(
        repos=repos,
        project_id=project_id,
    ):
        if (
            record.kind == work_item.target_kind
            and record.record_id == work_item.target_id
        ):
            return record
    return None


async def finish_critic_review_work_item(
    *,
    repos: Repositories,
    project_id: str,
    work_item: WorkItemRecord,
    max_noop_attempts: int = 3,
) -> WorkItemRecord | None:
    target = await pending_critic_record_for_work_item(
        repos=repos,
        project_id=project_id,
        work_item=work_item,
    )
    if target is None:
        return await repos.work_items.finish(
            item_id=work_item.id,
            status=WorkItemStatus.DONE,
            owner_workflow_id=work_item.owner_workflow_id,
            payload={
                **work_item.payload,
                "completion_reason": "target_cleared",
            },
        )
    if work_item.attempt >= max_noop_attempts:
        return await repos.work_items.finish(
            item_id=work_item.id,
            status=WorkItemStatus.FAILED,
            owner_workflow_id=work_item.owner_workflow_id,
            payload={
                **work_item.payload,
                "completion_reason": "target_still_pending",
                "last_pending_status": target.status.value,
                "max_noop_attempts": max_noop_attempts,
            },
        )
    return await repos.work_items.requeue(
        item_id=work_item.id,
        owner_workflow_id=work_item.owner_workflow_id,
        payload={
            **work_item.payload,
            "last_pending_status": target.status.value,
        },
    )


async def fail_critic_review_work_item(
    *,
    repos: Repositories,
    work_item: WorkItemRecord,
    error: BaseException,
) -> WorkItemRecord | None:
    return await repos.work_items.finish(
        item_id=work_item.id,
        status=WorkItemStatus.FAILED,
        owner_workflow_id=work_item.owner_workflow_id,
        payload={
            **work_item.payload,
            "error": str(error),
        },
    )


def critic_review_target_label(target: PendingCriticRecord) -> str:
    return f"{target.kind} {target.record_id} ({target.status.value})"


def _append_pending(
    *,
    pending: list[PendingCriticRecord],
    kind: str,
    records: Iterable[_ReviewableRecord],
    statuses: set[RecordStatus],
    limit: int | None,
) -> None:
    for record in records:
        if record.status not in statuses:
            continue
        pending.append(
            PendingCriticRecord(
                kind=kind,
                record_id=record.id,
                status=record.status,
            )
        )
        if _reached_limit(records=pending, limit=limit):
            return


def _reached_limit(
    *,
    records: list[PendingCriticRecord],
    limit: int | None,
) -> bool:
    return limit is not None and len(records) >= limit
