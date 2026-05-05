from __future__ import annotations

from typing import Any

from pydantic import Field

from ..repository_command import RepositoryCommand


class AddEvidence(RepositoryCommand):
    run_id: str
    experiment_id: str
    summary: str
    signals: list[dict[str, Any]] = Field(default_factory=list)
    raw: dict[str, Any] = Field(default_factory=dict)
