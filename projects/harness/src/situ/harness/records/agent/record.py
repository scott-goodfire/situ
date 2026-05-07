from __future__ import annotations

from enum import StrEnum

from ..base import DbRecord


class AgentKind(StrEnum):
    MANAGER = "manager"
    RESEARCHER = "researcher"
    SCIENTIST = "scientist"
    CRITIC = "critic"


class AgentStatus(StrEnum):
    IDLE = "idle"
    ACTIVE = "active"
    CLOSED = "closed"


def parse_agent_kind(kind: AgentKind | str) -> AgentKind:
    try:
        return AgentKind(kind)
    except ValueError as error:
        allowed = ", ".join(f"'{item.value}'" for item in AgentKind)
        raise ValueError(f"invalid agent kind: {kind!r}. Use exactly one of {allowed}.") from error


def parse_agent_status(status: AgentStatus | str) -> AgentStatus:
    try:
        return AgentStatus(status)
    except ValueError as error:
        allowed = ", ".join(f"'{item.value}'" for item in AgentStatus)
        raise ValueError(
            f"invalid agent status: {status!r}. Use exactly one of {allowed}."
        ) from error


class AgentRecord(DbRecord):
    id: str
    project_id: str
    created_in_session_id: str | None = None
    kind: AgentKind
    display_name: str
    model_name: str | None = None
    status: AgentStatus
    created_at: str
    updated_at: str
