from __future__ import annotations

from enum import StrEnum
from typing import Any

from pydantic import Field

from ..base import DbRecord


class ExperimentActivityKind(StrEnum):
    CREATED = "created"
    UPDATED = "updated"
    STATUS_UPDATED = "status_updated"
    RECORDED = "recorded"
    COMMENT = "comment"


class ExperimentActivityRecord(DbRecord):
    id: int
    experiment_id: str
    created_in_session_id: str | None = None
    actor: str
    kind: ExperimentActivityKind
    body: str
    payload: dict[str, Any] = Field(default_factory=dict)
    created_at: str
