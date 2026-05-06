from __future__ import annotations

from pydantic import BaseModel, ConfigDict

from ...records import (
    AgentRecord,
    AnalysisActivityRecord,
    AnalysisRecord,
    ArtifactRecord,
    BaselineRecord,
    EventRecord,
    EvaluationActivityRecord,
    EvaluationRecord,
    ExperimentActivityRecord,
    ExperimentRecord,
    HypothesisActivityRecord,
    HypothesisExperimentLinkRecord,
    HypothesisRecord,
    MeasurementRecord,
    ProjectRecord,
    SessionRecord,
    TaskActivityRecord,
    TaskDependencyRecord,
    TaskEntityLinkRecord,
    TaskRecord,
    WorkspaceRecord,
)


class NextSessionIdSchema(BaseModel):
    model_config = ConfigDict(extra="forbid")

    session_id: str
    session_number: int


class SessionGraphSchema(BaseModel):
    model_config = ConfigDict(extra="forbid")

    workspace: WorkspaceRecord | None = None
    project: ProjectRecord | None = None
    session: SessionRecord | None = None
    hypotheses: list[HypothesisRecord]
    baselines: list[BaselineRecord]
    experiments: list[ExperimentRecord]
    evaluations: list[EvaluationRecord]
    measurements: list[MeasurementRecord]
    hypothesis_experiment_links: list[HypothesisExperimentLinkRecord]
    agents: list[AgentRecord]
    tasks: list[TaskRecord]
    task_dependencies: list[TaskDependencyRecord]
    task_entity_links: list[TaskEntityLinkRecord]
    task_activities: list[TaskActivityRecord]
    analyses: list[AnalysisRecord]
    analysis_activities: list[AnalysisActivityRecord]
    hypothesis_activities: list[HypothesisActivityRecord]
    experiment_activities: list[ExperimentActivityRecord]
    evaluation_activities: list[EvaluationActivityRecord]
    artifacts: list[ArtifactRecord]
    events: list[EventRecord]
