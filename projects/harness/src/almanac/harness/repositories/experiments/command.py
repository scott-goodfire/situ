from __future__ import annotations

from pydantic import Field

from ..base.command import RepositoryCommand


class CreateExperiment(RepositoryCommand):
    experiment_id: str
    run_id: str
    intent: str
    change_summary: str
    components: list[str] = Field(default_factory=list)
    based_on: list[str] = Field(default_factory=list)


class UpdateExperiment(RepositoryCommand):
    experiment_id: str
    status: str
    suspicious: bool | None = None
    suspicious_reason: str | None = None
    note: str | None = None
