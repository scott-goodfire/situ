from __future__ import annotations

from enum import StrEnum
from typing import Any

from pydantic import Field

from ..base import DbRecord


class ActivityKind(StrEnum):
    COMMENT = "comment"


class HypothesisActivityRecord(DbRecord):
    id: int
    hypothesis_id: str
    actor: str
    kind: ActivityKind
    body: str
    payload: dict[str, Any] = Field(default_factory=dict)
    created_at: str
