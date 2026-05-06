from typing import Any, Literal

from pydantic import BaseModel, ConfigDict, Field

from .events import (
    AgentRecord,
    ArtifactRecord,
    EventRecord,
    EvaluationActivityRecord,
    EvaluationRecord,
    ExperimentActivityRecord,
    ExperimentRecord,
    HypothesisActivityRecord,
    HypothesisExperimentLinkRecord,
    HypothesisRecord,
    ProjectRecord,
    SessionRecord,
    TaskActivityRecord,
    TaskDependencyRecord,
    TaskEntityLinkRecord,
    TaskRecord,
    WorkspaceRecord,
)


class HarnessHelloParams(BaseModel):
    model_config = ConfigDict(extra="forbid")

    name: str = "world"


class HarnessHelloResult(BaseModel):
    model_config = ConfigDict(extra="forbid")

    message: str
    harness: str = "python"


class SetupGetParams(BaseModel):
    model_config = ConfigDict(extra="forbid")


class SetupGetResult(BaseModel):
    model_config = ConfigDict(extra="forbid")

    configured: bool
    workspace: WorkspaceRecord | None = None


class SetupCompleteParams(BaseModel):
    model_config = ConfigDict(extra="forbid")


class SetupCompleteResult(BaseModel):
    model_config = ConfigDict(extra="forbid")

    workspace: WorkspaceRecord


CollectionName = Literal[
    "workspaces",
    "projects",
    "sessions",
    "hypotheses",
    "experiments",
    "evaluations",
    "hypothesis_experiment_links",
    "agents",
    "tasks",
    "task_dependencies",
    "task_entity_links",
    "task_activities",
    "hypothesis_activities",
    "experiment_activities",
    "evaluation_activities",
    "artifacts",
    "events",
]


class CollectionsBootstrapParams(BaseModel):
    model_config = ConfigDict(extra="forbid")


class CollectionsBootstrapResult(BaseModel):
    model_config = ConfigDict(extra="forbid")

    cursor: int
    workspaces: list[WorkspaceRecord] = Field(default_factory=list)
    projects: list[ProjectRecord] = Field(default_factory=list)
    sessions: list[SessionRecord]
    hypotheses: list[HypothesisRecord]
    experiments: list[ExperimentRecord]
    evaluations: list[EvaluationRecord]
    hypothesis_experiment_links: list[HypothesisExperimentLinkRecord]
    agents: list[AgentRecord] = Field(default_factory=list)
    tasks: list[TaskRecord] = Field(default_factory=list)
    task_dependencies: list[TaskDependencyRecord] = Field(default_factory=list)
    task_entity_links: list[TaskEntityLinkRecord] = Field(default_factory=list)
    task_activities: list[TaskActivityRecord] = Field(default_factory=list)
    hypothesis_activities: list[HypothesisActivityRecord]
    experiment_activities: list[ExperimentActivityRecord]
    evaluation_activities: list[EvaluationActivityRecord]
    artifacts: list[ArtifactRecord]
    events: list[EventRecord]


class CollectionsSubscribeParams(BaseModel):
    model_config = ConfigDict(extra="forbid")


class CollectionsSubscribeResult(BaseModel):
    model_config = ConfigDict(extra="forbid")

    subscribed: bool
    cursor: int


class CollectionUpsertedParams(BaseModel):
    model_config = ConfigDict(extra="forbid")

    cursor: int
    collection: CollectionName
    key: str
    record: dict[str, Any]


class EventsSubscribeParams(BaseModel):
    model_config = ConfigDict(extra="forbid")

    replay_existing: bool = False


class EventsSubscribeResult(BaseModel):
    model_config = ConfigDict(extra="forbid")

    subscribed: bool
    replayed: int = 0


class SessionStartParams(BaseModel):
    model_config = ConfigDict(extra="forbid")

    objective: str = ""
    research_context: str = ""
    project_title: str | None = None
    project_id: str | None = None
    max_experiments: int = 6


class SessionStartResult(BaseModel):
    model_config = ConfigDict(extra="forbid")

    session_id: str
    status: str


class SessionResumeParams(BaseModel):
    model_config = ConfigDict(extra="forbid")

    session_id: str
    max_experiments: int = 6


class SessionResumeResult(BaseModel):
    model_config = ConfigDict(extra="forbid")

    session_id: str
    status: str


class SessionStatusParams(BaseModel):
    model_config = ConfigDict(extra="forbid")

    session_id: str


class SessionStatusResult(BaseModel):
    model_config = ConfigDict(extra="forbid")

    session: SessionRecord | None
