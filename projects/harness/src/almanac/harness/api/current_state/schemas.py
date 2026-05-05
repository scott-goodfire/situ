from __future__ import annotations

from pydantic import BaseModel, ConfigDict

from ...records import (
    EventRecord,
    EvidenceRecord,
    ExperimentRecord,
    FindingRecord,
    ProjectConfigRecord,
    RunRecord,
    WarningRecord,
)


class CurrentStateSchema(BaseModel):
    model_config = ConfigDict(extra="forbid")

    config: ProjectConfigRecord | None
    runs: list[RunRecord]
    experiments: list[ExperimentRecord]
    evidence: list[EvidenceRecord]
    findings: list[FindingRecord]
    warnings: list[WarningRecord]
    events: list[EventRecord]
