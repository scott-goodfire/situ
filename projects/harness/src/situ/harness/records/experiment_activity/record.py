from __future__ import annotations

from enum import StrEnum
from typing import Any

from pydantic import Field

from ..base import DbRecord


class ExperimentActivityKind(StrEnum):
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
