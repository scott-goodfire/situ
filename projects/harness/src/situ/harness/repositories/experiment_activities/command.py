from __future__ import annotations

from typing import Any

from pydantic import Field

from ...records import ExperimentActivityKind
from ..base.command import RepositoryCommand


class AddExperimentActivity(RepositoryCommand):
    experiment_id: str
    created_in_session_id: str | None = None
    actor: str
    kind: ExperimentActivityKind
    body: str
    payload: dict[str, Any] = Field(default_factory=dict)
