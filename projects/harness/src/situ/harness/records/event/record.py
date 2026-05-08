from __future__ import annotations

from typing import Any

from pydantic import Field

from ..base import DbRecord


class EventRecord(DbRecord):
    id: int
    associated_project_id: str | None = None
    associated_session_id: str | None = None
    type: str
    message: str
    payload: dict[str, Any] = Field(default_factory=dict)
    created_at: str
