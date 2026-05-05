from __future__ import annotations

from typing import Any, Literal

from pydantic import Field

from ..base import DbRecord


ActivityKind = Literal["comment", "update", "result", "concern", "decision"]


class HypothesisActivityRecord(DbRecord):
    id: int
    hypothesis_id: str
    session_id: str | None = None
    actor: str
    kind: ActivityKind
    body: str
    payload: dict[str, Any] = Field(default_factory=dict)
    created_at: str
