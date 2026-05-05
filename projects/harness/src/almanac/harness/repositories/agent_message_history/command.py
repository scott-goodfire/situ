from __future__ import annotations

from ..base.command import RepositoryCommand


class AppendAgentMessageHistory(RepositoryCommand):
    run_id: str
    agent_name: str
    messages_json: str
    pydantic_run_id: str | None = None
    conversation_id: str | None = None
