from __future__ import annotations

from ..base import DbRecord


class ResearchContextRecord(DbRecord):
    id: str
    session_id: str
    body: str
    created_at: str
    updated_at: str
