from __future__ import annotations

from ...records import AgentKind, AgentStatus
from ..base.command import RepositoryCommand


class CreateAgent(RepositoryCommand):
    agent_id: str
    project_id: str
    created_in_session_id: str | None = None
    kind: AgentKind
    display_name: str
    model_name: str | None = None
    status: AgentStatus = AgentStatus.IDLE


class UpdateAgent(RepositoryCommand):
    agent_id: str
    display_name: str | None = None
    model_name: str | None = None
    status: AgentStatus | None = None
