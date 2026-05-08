from typing import Any, Literal

from pydantic import BaseModel, Field

from .events import (
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


SecretSource = Literal["local", "missing"]


class SecretsStatusParams(BaseModel):
    pass


class SecretsStatusResult(BaseModel):
    anthropic_key_configured: bool
    anthropic_key_source: SecretSource
    logfire_token_configured: bool = False
    logfire_token_source: SecretSource = "missing"


class SecretsSetAnthropicKeyParams(BaseModel):
    anthropic_key: str
    logfire_token: str | None = None


class SecretsSetAnthropicKeyResult(BaseModel):
    anthropic_key_configured: bool = True
    anthropic_key_source: Literal["local"] = "local"
    logfire_token_configured: bool = False
    logfire_token_source: SecretSource = "missing"


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
    "baseline_activities",
    "experiment_activities",
    "evaluation_activities",
    "artifacts",
    "events",
    "compute_targets",
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
    baseline_activities: list[BaselineActivityRecord] = Field(default_factory=list)
    experiment_activities: list[ExperimentActivityRecord]
    evaluation_activities: list[EvaluationActivityRecord]
    artifacts: list[ArtifactRecord]
    events: list[EventRecord]
    compute_targets: list[ComputeTargetRecord] = Field(default_factory=list)


class CollectionsSubscribeParams(BaseModel):
    pass


class CollectionsSubscribeResult(BaseModel):
    subscribed: bool
    cursor: int


class CollectionsChangesSinceParams(BaseModel):
    cursor: int
    limit: int = 500


class CollectionChangeParams(BaseModel):
    cursor: int
    collection: CollectionName
    key: str
    op: Literal["upsert", "delete"]
    record: dict[str, Any] | None = None
    source_event_id: int | None = None


class CollectionsChangesSinceResult(BaseModel):
    changes: list[CollectionChangeParams]
    cursor: int
    has_more: bool = False
    reset_required: bool = False


class CollectionUpsertedParams(BaseModel):
    cursor: int
    collection: CollectionName
    key: str
    record: dict[str, Any]
    source_event_id: int | None = None


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


class ArtifactReadParams(BaseModel):
    artifact_id: str


class ArtifactReadResult(BaseModel):
    artifact_id: str
    media_type: str | None = None
    size_bytes: int | None = None
    content: str
    truncated: bool = False
    truncated_at_bytes: int | None = None
