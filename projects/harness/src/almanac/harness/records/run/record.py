from __future__ import annotations

from ..base import DbRecord


class RunRecord(DbRecord):
    id: str
    status: str
    created_at: str
    updated_at: str
