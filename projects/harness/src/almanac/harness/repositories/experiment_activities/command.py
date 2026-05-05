from __future__ import annotations

from typing import Any

from pydantic import Field

from ..base.command import RepositoryCommand


class AddExperimentActivity(RepositoryCommand):
    experiment_id: str
    actor: str
    kind: str
    body: str
    session_id: str | None = None
    payload: dict[str, Any] = Field(default_factory=dict)
