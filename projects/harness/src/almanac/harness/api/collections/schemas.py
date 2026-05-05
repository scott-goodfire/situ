from __future__ import annotations

from pydantic import BaseModel, ConfigDict

from ...records import EventRecord, ExperimentRecord, RunRecord


class CollectionsBootstrapSchema(BaseModel):
    model_config = ConfigDict(extra="forbid")

    cursor: int
    runs: list[RunRecord]
    experiments: list[ExperimentRecord]
    events: list[EventRecord]
