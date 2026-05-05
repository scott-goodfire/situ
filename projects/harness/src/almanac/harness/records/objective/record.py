from __future__ import annotations

from typing import Literal

from ..base import DbRecord


ObjectiveStatus = Literal["active", "closed"]


class ObjectiveRecord(DbRecord):
    id: str
    title: str
    description: str
    status: ObjectiveStatus
    associated_session_id: str | None = None
    created_at: str
    updated_at: str
