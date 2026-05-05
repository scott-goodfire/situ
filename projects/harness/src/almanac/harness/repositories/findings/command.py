from __future__ import annotations

from typing import Literal

from pydantic import Field

from ..base.command import RepositoryCommand


class UpsertFinding(RepositoryCommand):
    finding_id: str
    run_id: str
    summary: str
    evidence_experiment_ids: list[str] = Field(default_factory=list)
    confidence: Literal["low", "medium", "high"]
    status: Literal["open", "supported", "contradicted"]
