from enum import StrEnum
from typing import Any

from pydantic import BaseModel, ConfigDict, Field


class ProjectStatus(StrEnum):
    ACTIVE = "active"
    CLOSED = "closed"


class SessionStatus(StrEnum):
    ACTIVE = "active"
    CLOSED = "closed"


class WorkStatus(StrEnum):
    OPEN = "open"
    ACTIVE = "active"
    CLOSED = "closed"


class ActivityKind(StrEnum):
    COMMENT = "comment"


class AgentKind(StrEnum):
    MANAGER = "manager"
    SCIENTIST = "scientist"


class AgentStatus(StrEnum):
    IDLE = "idle"
    ACTIVE = "active"
    CLOSED = "closed"


class TaskKind(StrEnum):
    PLAN = "plan"
    BASELINE = "baseline"
    HYPOTHESIZE = "hypothesize"
    EXPERIMENT = "experiment"
    INTERPRET = "interpret"
    REVIEW = "review"


class TaskStatus(StrEnum):
    BACKLOG = "backlog"
    IN_PROGRESS = "in_progress"
    DONE = "done"
    ABANDONED = "abandoned"
    FAILED = "failed"


class TaskPriority(StrEnum):
    URGENT = "urgent"
    HIGH = "high"
    NORMAL = "normal"
    LOW = "low"


class TaskSourceKind(StrEnum):
    MANAGER = "manager"
    USER = "user"
    SYSTEM = "system"


class TaskEntityKind(StrEnum):
    HYPOTHESIS = "hypothesis"
    EXPERIMENT = "experiment"
    EVALUATION = "evaluation"
    ARTIFACT = "artifact"
    HYPOTHESIS_ACTIVITY = "hypothesis_activity"
    EXPERIMENT_ACTIVITY = "experiment_activity"
    EVALUATION_ACTIVITY = "evaluation_activity"
    TASK_ACTIVITY = "task_activity"
    EVENT = "event"


class WorkspaceRecord(BaseModel):
    model_config = ConfigDict(extra="forbid")

    id: str
    repo_path: str
    created_at: str
    updated_at: str


class ProjectRecord(BaseModel):
    model_config = ConfigDict(extra="forbid")

    id: str
    workspace_id: str
    title: str
    objective: str
    research_context: str
    status: ProjectStatus
    created_at: str
    updated_at: str


class SessionRecord(BaseModel):
    model_config = ConfigDict(extra="forbid")

    id: str
    workspace_id: str
    project_id: str | None = None
    status: SessionStatus
    created_at: str
    updated_at: str


class HypothesisRecord(BaseModel):
    model_config = ConfigDict(extra="forbid")

    id: str
    project_id: str
    created_in_session_id: str | None = None
    title: str
    summary: str
    status: WorkStatus
    created_at: str
    updated_at: str


class ExperimentRecord(BaseModel):
    model_config = ConfigDict(extra="forbid")

    id: str
    project_id: str
    created_in_session_id: str | None = None
    status: WorkStatus
    title: str
    summary: str
    created_at: str
    updated_at: str


class EvaluationRecord(BaseModel):
    model_config = ConfigDict(extra="forbid")

    id: str
    project_id: str
    created_in_session_id: str | None = None
    status: WorkStatus
    title: str
    summary: str
    associated_experiment_id: str | None = None
    created_at: str
    updated_at: str


class HypothesisExperimentLinkRecord(BaseModel):
    model_config = ConfigDict(extra="forbid")

    hypothesis_id: str
    experiment_id: str
    created_at: str


class AgentRecord(BaseModel):
    model_config = ConfigDict(extra="forbid")

    id: str
    project_id: str
    created_in_session_id: str | None = None
    kind: AgentKind
    display_name: str
    model_name: str | None = None
    status: AgentStatus
    created_at: str
    updated_at: str


class TaskRecord(BaseModel):
    model_config = ConfigDict(extra="forbid")

    id: str
    project_id: str
    created_in_session_id: str | None = None
    title: str
    content: str
    kind: TaskKind
    status: TaskStatus
    priority: TaskPriority
    source_kind: TaskSourceKind
    assignee_id: str | None = None
    parent_task_id: str | None = None
    payload: dict[str, Any] = Field(default_factory=dict)
    pydantic_run_id: str | None = None
    conversation_id: str | None = None
    result_summary: str | None = None
    created_at: str
    available_at: str
    claimed_in_session_id: str | None = None
    claimed_at: str | None = None
    completed_in_session_id: str | None = None
    completed_at: str | None = None
    updated_at: str


class TaskDependencyRecord(BaseModel):
    model_config = ConfigDict(extra="forbid")

    project_id: str
    task_id: str
    blocked_by_task_id: str
    created_at: str


class TaskEntityLinkRecord(BaseModel):
    model_config = ConfigDict(extra="forbid")

    project_id: str
    task_id: str
    entity_kind: TaskEntityKind
    entity_id: str
    relationship: str
    created_at: str


class TaskActivityRecord(BaseModel):
    model_config = ConfigDict(extra="forbid")

    id: int
    project_id: str
    task_id: str
    created_in_session_id: str | None = None
    actor_agent_id: str | None = None
    actor: str
    kind: ActivityKind
    body: str
    payload: dict[str, Any] = Field(default_factory=dict)
    created_at: str


class HypothesisActivityRecord(BaseModel):
    model_config = ConfigDict(extra="forbid")

    id: int
    hypothesis_id: str
    created_in_session_id: str | None = None
    actor: str
    kind: ActivityKind
    body: str
    payload: dict[str, Any] = Field(default_factory=dict)
    created_at: str


class ExperimentActivityRecord(BaseModel):
    model_config = ConfigDict(extra="forbid")

    id: int
    experiment_id: str
    created_in_session_id: str | None = None
    actor: str
    kind: ActivityKind
    body: str
    payload: dict[str, Any] = Field(default_factory=dict)
    created_at: str


class EvaluationActivityRecord(BaseModel):
    model_config = ConfigDict(extra="forbid")

    id: int
    evaluation_id: str
    created_in_session_id: str | None = None
    actor: str
    kind: ActivityKind
    body: str
    payload: dict[str, Any] = Field(default_factory=dict)
    created_at: str


class ArtifactRecord(BaseModel):
    model_config = ConfigDict(extra="forbid")

    id: str
    project_id: str
    created_in_session_id: str | None = None
    associated_entity_kind: str
    associated_entity_id: str
    kind: str
    title: str
    path: str
    media_type: str | None = None
    size_bytes: int | None = None
    created_at: str


class EventRecord(BaseModel):
    model_config = ConfigDict(extra="forbid")

    id: int
    associated_project_id: str | None = None
    associated_session_id: str | None = None
    type: str
    message: str
    payload: dict[str, Any] = Field(default_factory=dict)
    created_at: str
