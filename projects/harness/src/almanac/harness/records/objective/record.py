from __future__ import annotations

from enum import StrEnum

from ..base import DbRecord


class ObjectiveStatus(StrEnum):
    ACTIVE = "active"
    CLOSED = "closed"


def parse_objective_status(
    *,
    status: ObjectiveStatus | str,
) -> ObjectiveStatus:
    try:
        return ObjectiveStatus(status)
    except ValueError as error:
        allowed = ", ".join(f"'{item.value}'" for item in ObjectiveStatus)
        raise ValueError(
            f"invalid objective status: {status!r}. Use exactly one of {allowed}."
        ) from error


class ObjectiveRecord(DbRecord):
    id: str
    session_id: str
    title: str
    description: str
    status: ObjectiveStatus
    created_at: str
    updated_at: str
