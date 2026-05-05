from __future__ import annotations

from pydantic import BaseModel, ConfigDict

from ...records import (
    ArtifactRecord,
    EventRecord,
    EvaluationActivityRecord,
    EvaluationRecord,
    ExperimentActivityRecord,
    ExperimentRecord,
    HypothesisActivityRecord,
    HypothesisExperimentLinkRecord,
    HypothesisRecord,
    ObjectiveRecord,
    ProjectRecord,
    ResearchContextRecord,
    SessionRecord,
)


class NextSessionIdSchema(BaseModel):
    model_config = ConfigDict(extra="forbid")

    session_id: str
    session_number: int


class SessionGraphSchema(BaseModel):
    model_config = ConfigDict(extra="forbid")

    project: ProjectRecord | None = None
    session: SessionRecord | None = None
    objective: ObjectiveRecord | None = None
    research_context: ResearchContextRecord | None = None
    hypotheses: list[HypothesisRecord]
    experiments: list[ExperimentRecord]
    evaluations: list[EvaluationRecord]
    hypothesis_experiment_links: list[HypothesisExperimentLinkRecord]
    hypothesis_activities: list[HypothesisActivityRecord]
    experiment_activities: list[ExperimentActivityRecord]
    evaluation_activities: list[EvaluationActivityRecord]
    artifacts: list[ArtifactRecord]
    events: list[EventRecord]
