from __future__ import annotations

from typing import Any

from pydantic import Field

from ..base.command import RepositoryCommand


class AddExperimentActivity(RepositoryCommand):
    experiment_id: str
    actor: str
    kind: str
    body: str
    payload: dict[str, Any] = Field(default_factory=dict)
