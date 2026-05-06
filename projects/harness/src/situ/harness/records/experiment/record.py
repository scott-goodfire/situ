from __future__ import annotations

from enum import StrEnum

from ..base import DbRecord


class WorkStatus(StrEnum):
    OPEN = "open"
    ACTIVE = "active"
    CLOSED = "closed"


def parse_work_status(
    *,
    status: WorkStatus | str,
    noun: str = "work item",
) -> WorkStatus:
    try:
        return WorkStatus(status)
    except ValueError as error:
        allowed = ", ".join(f"'{item.value}'" for item in WorkStatus)
        raise ValueError(
            f"invalid {noun} status: {status!r}. Use exactly one of {allowed}. "
            "Record result details such as 'completed', 'failed', or 'suspicious' "
            "in a comment instead."
        ) from error


class ExperimentRecord(DbRecord):
    id: str
    project_id: str
    created_in_session_id: str | None = None
    status: WorkStatus
    title: str
    summary: str
    created_at: str
    updated_at: str
