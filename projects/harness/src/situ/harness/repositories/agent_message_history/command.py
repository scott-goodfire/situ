from __future__ import annotations

from ..base.command import RepositoryCommand


class AppendAgentMessageHistory(RepositoryCommand):
    project_id: str
    created_in_session_id: str | None = None
    agent_id: str | None = None
    agent_name: str
    messages_json: str
    pydantic_run_id: str | None = None
    conversation_id: str | None = None
