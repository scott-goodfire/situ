from __future__ import annotations

from typing import Any

from pydantic import Field

from ..base.command import RepositoryCommand


class AddEvent(RepositoryCommand):
    event_type: str
    message: str
    associated_project_id: str | None = None
    associated_session_id: str | None = None
    payload: dict[str, Any] = Field(default_factory=dict)
