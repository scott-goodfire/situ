from __future__ import annotations

from pydantic import BaseModel, ConfigDict, Field

from ...records import (
    EvidenceRecord,
    ExperimentRecord,
    FindingRecord,
    ProjectConfigRecord,
    RunRecord,
    WarningRecord,
)


class RunContextSchema(BaseModel):
    model_config = ConfigDict(extra="forbid")

    config: ProjectConfigRecord | None = None
    run: RunRecord | None = None
    recent_experiments: list[ExperimentRecord] = Field(default_factory=list)
    recent_evidence: list[EvidenceRecord] = Field(default_factory=list)
    recent_findings: list[FindingRecord] = Field(default_factory=list)
    recent_warnings: list[WarningRecord] = Field(default_factory=list)
