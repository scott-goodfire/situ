from __future__ import annotations

from typing import Any

from ..base import DbRecord


class AgentMessageHistoryRecord(DbRecord):
    id: int
    project_id: str
    created_in_session_id: str | None = None
    agent_id: str | None = None
    agent_name: str
    pydantic_run_id: str | None = None
    conversation_id: str | None = None
    messages: list[dict[str, Any]]
    created_at: str
