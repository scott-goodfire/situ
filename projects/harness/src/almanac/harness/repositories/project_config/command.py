from __future__ import annotations

from pydantic import Field

from ..base.command import RepositoryCommand


class SetProjectConfig(RepositoryCommand):
    goal: str
    evaluation_context: str
    known_signals: list[str] = Field(default_factory=list)
    experiment_scope: str
