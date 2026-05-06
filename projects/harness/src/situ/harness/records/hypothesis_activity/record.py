from __future__ import annotations

from enum import StrEnum
from typing import Any

from pydantic import Field

from ..base import DbRecord


class HypothesisActivityKind(StrEnum):
    COMMENT = "comment"


class HypothesisActivityRecord(DbRecord):
    id: int
    hypothesis_id: str
    created_in_session_id: str | None = None
    actor: str
    kind: HypothesisActivityKind
    body: str
    payload: dict[str, Any] = Field(default_factory=dict)
    created_at: str
