from typing import Any, Literal

from pydantic import BaseModel, Field

from .events import (
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


class HarnessHelloParams(BaseModel):
    name: str = "world"


class HarnessHelloResult(BaseModel):
    message: str
    harness: str = "python"


class SetupGetParams(BaseModel):
    pass


class SetupGetResult(BaseModel):
    configured: bool
    workspace: WorkspaceRecord | None = None


class SetupCompleteParams(BaseModel):
    pass


class SetupCompleteResult(BaseModel):
    workspace: WorkspaceRecord


CollectionName = Literal[
    "workspaces",
    "projects",
    "sessions",
    "hypotheses",
    "baselines",
    "experiments",
    "evaluations",
    "measurements",
    "analyses",
    "hypothesis_experiment_links",
    "agents",
    "tasks",
    "task_dependencies",
    "task_entity_links",
    "task_activities",
    "analysis_activities",
    "hypothesis_activities",
    "experiment_activities",
    "evaluation_activities",
    "artifacts",
    "events",
]


class CollectionsBootstrapParams(BaseModel):
    pass


class CollectionsBootstrapResult(BaseModel):
    cursor: int
    workspaces: list[WorkspaceRecord] = Field(default_factory=list)
    projects: list[ProjectRecord] = Field(default_factory=list)
    sessions: list[SessionRecord]
    hypotheses: list[HypothesisRecord]
    baselines: list[BaselineRecord] = Field(default_factory=list)
    experiments: list[ExperimentRecord]
    evaluations: list[EvaluationRecord]
    measurements: list[MeasurementRecord] = Field(default_factory=list)
    analyses: list[AnalysisRecord] = Field(default_factory=list)
    hypothesis_experiment_links: list[HypothesisExperimentLinkRecord]
    agents: list[AgentRecord] = Field(default_factory=list)
    tasks: list[TaskRecord] = Field(default_factory=list)
    task_dependencies: list[TaskDependencyRecord] = Field(default_factory=list)
    task_entity_links: list[TaskEntityLinkRecord] = Field(default_factory=list)
    task_activities: list[TaskActivityRecord] = Field(default_factory=list)
    analysis_activities: list[AnalysisActivityRecord] = Field(default_factory=list)
    hypothesis_activities: list[HypothesisActivityRecord]
    experiment_activities: list[ExperimentActivityRecord]
    evaluation_activities: list[EvaluationActivityRecord]
    artifacts: list[ArtifactRecord]
    events: list[EventRecord]


class CollectionsSubscribeParams(BaseModel):
    pass


class CollectionsSubscribeResult(BaseModel):
    subscribed: bool
    cursor: int


class CollectionUpsertedParams(BaseModel):
    cursor: int
    collection: CollectionName
    key: str
    record: dict[str, Any]


class EventsSubscribeParams(BaseModel):
    replay_existing: bool = False


class EventsSubscribeResult(BaseModel):
    subscribed: bool
    replayed: int = 0


class SessionStartParams(BaseModel):
    objective: str = ""
    research_context: str = ""
    project_title: str | None = None
    project_id: str | None = None
    max_experiments: int = 6


class SessionStartResult(BaseModel):
    session_id: str
    status: str


class SessionResumeParams(BaseModel):
    session_id: str
    max_experiments: int = 6


class SessionResumeResult(BaseModel):
    session_id: str
    status: str


class SessionStatusParams(BaseModel):
    session_id: str


class SessionStatusResult(BaseModel):
    session: SessionRecord | None
