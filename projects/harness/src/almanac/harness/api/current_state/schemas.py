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
    ProjectConfigRecord,
    SessionRecord,
)


class CurrentStateSchema(BaseModel):
    model_config = ConfigDict(extra="forbid")

    config: ProjectConfigRecord | None
    objectives: list[ObjectiveRecord]
    sessions: list[SessionRecord]
    hypotheses: list[HypothesisRecord]
    experiments: list[ExperimentRecord]
    evaluations: list[EvaluationRecord]
    hypothesis_experiment_links: list[HypothesisExperimentLinkRecord]
    hypothesis_activities: list[HypothesisActivityRecord]
    experiment_activities: list[ExperimentActivityRecord]
    evaluation_activities: list[EvaluationActivityRecord]
    artifacts: list[ArtifactRecord]
    events: list[EventRecord]
