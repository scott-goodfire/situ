from __future__ import annotations

from typing import Any

from pydantic import Field

from ..base.command import RepositoryCommand


class AddTaskActivity(RepositoryCommand):
    project_id: str
    task_id: str
    created_in_session_id: str | None = None
    actor: str
    kind: str
    body: str
    actor_agent_id: str | None = None
    payload: dict[str, Any] = Field(default_factory=dict)
