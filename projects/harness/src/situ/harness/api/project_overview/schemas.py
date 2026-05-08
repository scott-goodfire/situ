from __future__ import annotations

from typing import Any

from pydantic import BaseModel, Field

from ...records import (
    AgentRecord,
    AnalysisActivityRecord,
    AnalysisRecord,
    ArtifactRecord,
    BaselineActivityRecord,
    BaselineRecord,
    ComputeTargetRecord,
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


class BoardSummarySchema(BaseModel):
    generated_at: str
    session_elapsed: str | None = None
    project_elapsed: str | None = None
    last_event_at: str | None = None
    time_since_last_event: str | None = None
    task_counts: dict[str, Any] = Field(default_factory=dict)
    record_counts: dict[str, Any] = Field(default_factory=dict)
    review_counts: dict[str, int] = Field(default_factory=dict)


class ProjectOverviewSchema(BaseModel):
    summary: BoardSummarySchema
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
    baseline_activities: list[BaselineActivityRecord]
    experiment_activities: list[ExperimentActivityRecord]
    evaluation_activities: list[EvaluationActivityRecord]
    artifacts: list[ArtifactRecord]
    events: list[EventRecord]
    compute_targets: list[ComputeTargetRecord]
