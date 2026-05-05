from __future__ import annotations

from typing import Literal

from ..base import DbRecord


SessionStatus = Literal["active", "closed"]


class SessionRecord(DbRecord):
    id: str
    objective_id: str
    status: SessionStatus
    created_at: str
    updated_at: str
