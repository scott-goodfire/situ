from __future__ import annotations

from enum import StrEnum
from typing import Any

from pydantic import Field

from ..base import DbRecord


class EvaluationActivityKind(StrEnum):
    CREATED = "created"
    UPDATED = "updated"
    STATUS_UPDATED = "status_updated"
    RECORDED = "recorded"
    COMMENT = "comment"


def parse_evaluation_activity_kind(
    kind: EvaluationActivityKind | str,
) -> EvaluationActivityKind:
    try:
        return EvaluationActivityKind(kind)
    except ValueError as error:
        allowed = ", ".join(f"'{item.value}'" for item in EvaluationActivityKind)
        raise ValueError(
            f"invalid evaluation activity kind: {kind!r}. Use exactly one of {allowed}."
        ) from error


class EvaluationActivityRecord(DbRecord):
    id: int
    evaluation_id: str
    created_in_session_id: str | None = None
    actor: str
    kind: EvaluationActivityKind
    body: str
    payload: dict[str, Any] = Field(default_factory=dict)
    created_at: str
