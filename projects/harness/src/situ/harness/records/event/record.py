from __future__ import annotations

from typing import Any

from ..base import DbRecord


class EventRecord(DbRecord):
    id: int
    session_id: str | None = None
    type: str
    message: str
    payload: dict[str, Any]
    created_at: str
