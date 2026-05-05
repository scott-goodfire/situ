from __future__ import annotations

from pydantic import BaseModel, ConfigDict

from ...records import (
    ArtifactRecord,
    EventRecord,
    ExperimentActivityRecord,
    ExperimentRecord,
    HypothesisActivityRecord,
    HypothesisExperimentLinkRecord,
    HypothesisRecord,
    ObjectiveRecord,
    ProjectConfigRecord,
    SessionRecord,
)


class NextSessionIdSchema(BaseModel):
    model_config = ConfigDict(extra="forbid")

    session_id: str
    session_number: int


class SessionGraphSchema(BaseModel):
    model_config = ConfigDict(extra="forbid")

    config: ProjectConfigRecord | None = None
    session: SessionRecord | None = None
    objective: ObjectiveRecord | None = None
    hypotheses: list[HypothesisRecord]
    experiments: list[ExperimentRecord]
    hypothesis_experiment_links: list[HypothesisExperimentLinkRecord]
    hypothesis_activities: list[HypothesisActivityRecord]
    experiment_activities: list[ExperimentActivityRecord]
    artifacts: list[ArtifactRecord]
    events: list[EventRecord]
