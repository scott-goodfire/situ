from __future__ import annotations

from typing import Any

from ..base import DbRecord


class AgentMessageHistoryRecord(DbRecord):
    id: int
    session_id: str
    agent_name: str
    pydantic_run_id: str | None = None
    conversation_id: str | None = None
    messages: list[dict[str, Any]]
    message_count: int
    created_at: str
