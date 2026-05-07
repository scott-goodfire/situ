from enum import StrEnum
from typing import Any, Literal

from pydantic import BaseModel, ConfigDict, Field, field_serializer, field_validator


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


class HypothesisActivityKind(StrEnum):
    COMMENT = "comment"


class ExperimentActivityKind(StrEnum):
    COMMENT = "comment"


class AnalysisActivityKind(StrEnum):
    COMMENT = "comment"


class TaskActivityKind(StrEnum):
    COMMENT = "comment"


class EvaluationActivityKind(StrEnum):
    RESULT = "result"


class AgentKind(StrEnum):
    MANAGER = "manager"
    SCIENTIST = "scientist"


class AgentStatus(StrEnum):
    IDLE = "idle"
    ACTIVE = "active"
    CLOSED = "closed"


MetricDirection = Literal[
    "higher_is_better",
    "lower_is_better",
    "target",
    "informational",
]
MetricScalar = bool | int | float | str


class MetricValue(BaseModel):
    value: MetricScalar
    unit: str | None = None
    direction: MetricDirection = "informational"
    notes: str | None = None


class MeasurementPayload(BaseModel):
    model_config = ConfigDict(extra="allow")

    activity_type: str | None = None
    measurement_type: str | None = None
    summary: str | None = None
    command: str | None = None
    workspace_state: dict[str, Any] | None = None
    metrics: dict[str, MetricValue] = Field(default_factory=dict)
    raw_output_summary: str | None = None
    artifact_ids: list[str] = Field(default_factory=list)
    concerns: list[dict[str, Any]] = Field(default_factory=list)
    comparison_baseline_id: str | None = None
    comparison_measurement_id: int | None = None
    comparison_metric_deltas: dict[str, MetricValue] = Field(default_factory=dict)

    @field_validator("metrics", "comparison_metric_deltas", mode="before")
    @classmethod
    def normalize_metric_map(cls, value: Any) -> Any:
        if value is None:
            return {}
        if not isinstance(value, dict):
            return value
        return {
            key: metric
            if isinstance(metric, (MetricValue, dict))
            else {"value": metric}
            for key, metric in value.items()
        }

    def to_storage_dict(self) -> dict[str, Any]:
        return self.model_dump(exclude_none=True, exclude_defaults=True)

    def get(self, key: str, default: Any = None) -> Any:
        return self.to_storage_dict().get(key, default)


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
    ANALYSIS = "analysis"
    BASELINE = "baseline"
    HYPOTHESIS = "hypothesis"
    EXPERIMENT = "experiment"
    EVALUATION = "evaluation"
    MEASUREMENT = "measurement"
    ARTIFACT = "artifact"
    ANALYSIS_ACTIVITY = "analysis_activity"
    HYPOTHESIS_ACTIVITY = "hypothesis_activity"
    EXPERIMENT_ACTIVITY = "experiment_activity"
    EVALUATION_ACTIVITY = "evaluation_activity"
    TASK_ACTIVITY = "task_activity"
    EVENT = "event"


class WorkspaceRecord(BaseModel):
    id: str
    repo_path: str
    created_at: str
    updated_at: str


class ProjectRecord(BaseModel):
    id: str
    workspace_id: str
    title: str
    objective: str
    research_context: str
    status: ProjectStatus
    created_at: str
    updated_at: str


class SessionRecord(BaseModel):
    id: str
    workspace_id: str
    project_id: str | None = None
    status: SessionStatus
    created_at: str
    updated_at: str


class HypothesisRecord(BaseModel):
    id: str
    project_id: str
    created_in_session_id: str | None = None
    title: str
    summary: str
    status: WorkStatus
    created_at: str
    updated_at: str


class ExperimentRecord(BaseModel):
    id: str
    project_id: str
    created_in_session_id: str | None = None
    status: WorkStatus
    title: str
    summary: str
    worktree_path: str | None = None
    base_commit: str | None = None
    created_at: str
    updated_at: str


class BaselineRecord(BaseModel):
    id: str
    project_id: str
    created_in_session_id: str | None = None
    status: WorkStatus
    title: str
    summary: str
    created_at: str
    updated_at: str


class EvaluationRecord(BaseModel):
    id: str
    project_id: str
    created_in_session_id: str | None = None
    status: WorkStatus
    title: str
    summary: str
    associated_baseline_id: str | None = None
    associated_experiment_id: str | None = None
    created_at: str
    updated_at: str


class AnalysisRecord(BaseModel):
    id: str
    project_id: str
    created_in_session_id: str | None = None
    created_by_agent_id: str | None = None
    status: WorkStatus
    title: str
    summary: str
    content: str
    supersedes_analysis_id: str | None = None
    created_at: str
    updated_at: str


class HypothesisExperimentLinkRecord(BaseModel):
    hypothesis_id: str
    experiment_id: str
    created_at: str


class AgentRecord(BaseModel):
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
    project_id: str
    task_id: str
    blocked_by_task_id: str
    created_at: str


class TaskEntityLinkRecord(BaseModel):
    project_id: str
    task_id: str
    entity_kind: TaskEntityKind
    entity_id: str
    relationship: str
    created_at: str


class TaskActivityRecord(BaseModel):
    id: int
    project_id: str
    task_id: str
    created_in_session_id: str | None = None
    actor_agent_id: str | None = None
    actor: str
    kind: TaskActivityKind
    body: str
    payload: dict[str, Any] = Field(default_factory=dict)
    created_at: str


class AnalysisActivityRecord(BaseModel):
    id: int
    analysis_id: str
    created_in_session_id: str | None = None
    actor: str
    kind: AnalysisActivityKind
    body: str
    payload: dict[str, Any] = Field(default_factory=dict)
    created_at: str


class HypothesisActivityRecord(BaseModel):
    id: int
    hypothesis_id: str
    created_in_session_id: str | None = None
    actor: str
    kind: HypothesisActivityKind
    body: str
    payload: dict[str, Any] = Field(default_factory=dict)
    created_at: str


class ExperimentActivityRecord(BaseModel):
    id: int
    experiment_id: str
    created_in_session_id: str | None = None
    actor: str
    kind: ExperimentActivityKind
    body: str
    payload: dict[str, Any] = Field(default_factory=dict)
    created_at: str


class EvaluationActivityRecord(BaseModel):
    id: int
    evaluation_id: str
    created_in_session_id: str | None = None
    actor: str
    kind: EvaluationActivityKind
    body: str
    payload: dict[str, Any] = Field(default_factory=dict)
    created_at: str


class MeasurementRecord(BaseModel):
    id: int
    evaluation_id: str
    created_in_session_id: str | None = None
    actor: str
    body: str
    payload: MeasurementPayload = Field(default_factory=MeasurementPayload)
    created_at: str

    @field_serializer("payload")
    def serialize_payload(self, payload: MeasurementPayload) -> dict[str, Any]:
        return payload.to_storage_dict()


class ArtifactRecord(BaseModel):
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
    id: int
    associated_project_id: str | None = None
    associated_session_id: str | None = None
    type: str
    message: str
    payload: dict[str, Any] = Field(default_factory=dict)
    created_at: str
