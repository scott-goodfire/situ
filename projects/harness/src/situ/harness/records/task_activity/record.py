from __future__ import annotations

from enum import StrEnum
from typing import Any

from pydantic import Field

from ..base import DbRecord


class TaskActivityKind(StrEnum):
    CREATED = "created"
    UPDATED = "updated"
    STATUS_UPDATED = "status_updated"
    RECORDED = "recorded"
    COMMENT = "comment"


class TaskActivityRecord(DbRecord):
    id: int
    project_id: str
    task_id: str
    created_in_session_id: str | None = None
    actor_agent_id: str | None = None
    actor: str
    kind: TaskActivityKind
    body: str
    payload: dict[str, Any] = Field(default_factory=dict)
    created_at: str
