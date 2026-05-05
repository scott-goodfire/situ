from __future__ import annotations

from pydantic import BaseModel, ConfigDict, Field

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


class AgentContextSchema(BaseModel):
    model_config = ConfigDict(extra="forbid")

    config: ProjectConfigRecord | None = None
    objective: ObjectiveRecord | None = None
    session: SessionRecord | None = None
    active_hypotheses: list[HypothesisRecord] = Field(default_factory=list)
    recent_experiments: list[ExperimentRecord] = Field(default_factory=list)
    hypothesis_experiment_links: list[HypothesisExperimentLinkRecord] = Field(default_factory=list)
    recent_hypothesis_activities: list[HypothesisActivityRecord] = Field(default_factory=list)
    recent_experiment_activities: list[ExperimentActivityRecord] = Field(default_factory=list)
    recent_artifacts: list[ArtifactRecord] = Field(default_factory=list)
    recent_events: list[EventRecord] = Field(default_factory=list)
