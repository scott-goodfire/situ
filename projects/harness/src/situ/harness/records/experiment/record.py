from __future__ import annotations

from enum import StrEnum

from ..base import DbRecord


class RecordStatus(StrEnum):
    TRIAGE = "triage"
    ACCEPTED = "accepted"
    ACTIVE = "active"
    IN_REVIEW = "in_review"
    DONE = "done"
    CANCELED = "canceled"
    FAILED = "failed"


def parse_record_status(
    *,
    status: RecordStatus | str,
    noun: str = "record",
) -> RecordStatus:
    try:
        return RecordStatus(status)
    except ValueError as error:
        allowed = ", ".join(f"'{item.value}'" for item in RecordStatus)
        raise ValueError(
            f"invalid {noun} status: {status!r}. Use exactly one of {allowed}."
        ) from error


class ExperimentRecord(DbRecord):
    id: str
    project_id: str
    created_in_session_id: str | None = None
    status: RecordStatus
    title: str
    summary: str
    worktree_path: str | None = None
    base_commit: str | None = None
    candidate_commit: str | None = None
    parent_experiment_id: str | None = None
    research_thread: str | None = None
    created_at: str
    updated_at: str
