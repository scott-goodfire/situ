from __future__ import annotations

from enum import StrEnum
from typing import Any

from pydantic import Field

from ..base import DbRecord


class WorkItemPurpose(StrEnum):
    CRITIC_REVIEW = "critic_review"


class WorkItemStatus(StrEnum):
    PENDING = "pending"
    CLAIMED = "claimed"
    DONE = "done"
    FAILED = "failed"
    CANCELED = "canceled"


def parse_work_item_purpose(purpose: WorkItemPurpose | str) -> WorkItemPurpose:
    try:
        return WorkItemPurpose(purpose)
    except ValueError as error:
        allowed = ", ".join(f"'{item.value}'" for item in WorkItemPurpose)
        raise ValueError(
            f"invalid work item purpose: {purpose!r}. Use exactly one of {allowed}."
        ) from error


def parse_work_item_status(status: WorkItemStatus | str) -> WorkItemStatus:
    try:
        return WorkItemStatus(status)
    except ValueError as error:
        allowed = ", ".join(f"'{item.value}'" for item in WorkItemStatus)
        raise ValueError(
            f"invalid work item status: {status!r}. Use exactly one of {allowed}."
        ) from error


class WorkItemRecord(DbRecord):
    id: str
    project_id: str
    created_in_session_id: str | None = None
    purpose: WorkItemPurpose
    target_kind: str
    target_id: str
    status: WorkItemStatus
    owner_workflow_id: str | None = None
    attempt: int = 0
    available_at: str
    claimed_at: str | None = None
    lease_expires_at: str | None = None
    completed_at: str | None = None
    payload: dict[str, Any] = Field(default_factory=dict)
    created_at: str
    updated_at: str
