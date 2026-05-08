from __future__ import annotations

from enum import StrEnum
from typing import Any

from pydantic import Field

from ..base import DbRecord


class BaselineActivityKind(StrEnum):
    CREATED = "created"
    UPDATED = "updated"
    STATUS_UPDATED = "status_updated"
    RECORDED = "recorded"
    COMMENT = "comment"


def parse_baseline_activity_kind(
    kind: BaselineActivityKind | str,
) -> BaselineActivityKind:
    try:
        return BaselineActivityKind(kind)
    except ValueError as error:
        allowed = ", ".join(f"'{item.value}'" for item in BaselineActivityKind)
        raise ValueError(
            f"invalid baseline activity kind: {kind!r}. Use exactly one of {allowed}."
        ) from error


class BaselineActivityRecord(DbRecord):
    id: int
    baseline_id: str
    created_in_session_id: str | None = None
    actor: str
    kind: BaselineActivityKind
    body: str
    payload: dict[str, Any] = Field(default_factory=dict)
    created_at: str
