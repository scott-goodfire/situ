from __future__ import annotations

from enum import StrEnum
from typing import Any

from pydantic import Field

from ..base import DbRecord


class AnalysisActivityKind(StrEnum):
    COMMENT = "comment"


class AnalysisActivityRecord(DbRecord):
    id: int
    analysis_id: str
    created_in_session_id: str | None = None
    actor: str
    kind: AnalysisActivityKind
    body: str
    payload: dict[str, Any] = Field(default_factory=dict)
    created_at: str
