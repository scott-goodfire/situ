from __future__ import annotations

from typing import Any

from pydantic import Field

from ..base import DbRecord
from ..hypothesis_activity import ActivityKind


class EvaluationActivityRecord(DbRecord):
    id: int
    evaluation_id: str
    created_in_session_id: str | None = None
    actor: str
    kind: ActivityKind
    body: str
    payload: dict[str, Any] = Field(default_factory=dict)
    created_at: str
