from __future__ import annotations

from enum import StrEnum

from ..base import DbRecord


class SessionStatus(StrEnum):
    ACTIVE = "active"
    CLOSED = "closed"


def parse_session_status(
    *,
    status: SessionStatus | str,
) -> SessionStatus:
    try:
        return SessionStatus(status)
    except ValueError as error:
        allowed = ", ".join(f"'{item.value}'" for item in SessionStatus)
        raise ValueError(
            f"invalid session status: {status!r}. Use exactly one of {allowed}."
        ) from error


class SessionRecord(DbRecord):
    id: str
    objective_id: str
    status: SessionStatus
    created_at: str
    updated_at: str
