from __future__ import annotations

from typing import Any

from pydantic import Field

from ..repository_command import RepositoryCommand


class AddEvent(RepositoryCommand):
    event_type: str
    message: str
    run_id: str | None = None
    payload: dict[str, Any] = Field(default_factory=dict)
