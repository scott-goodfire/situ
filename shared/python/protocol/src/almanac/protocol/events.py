from enum import StrEnum
from typing import Any

from pydantic import BaseModel, ConfigDict, Field


class ObjectiveStatus(StrEnum):
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


class ProjectRecord(BaseModel):
    model_config = ConfigDict(extra="forbid")

    id: str
    repo_path: str
    created_at: str
    updated_at: str


class ObjectiveRecord(BaseModel):
    model_config = ConfigDict(extra="forbid")

    id: str
    session_id: str
    title: str
    description: str
    status: ObjectiveStatus
    created_at: str
    updated_at: str


class ResearchContextRecord(BaseModel):
    model_config = ConfigDict(extra="forbid")

    id: str
    session_id: str
    body: str
    created_at: str
    updated_at: str


class SessionRecord(BaseModel):
    model_config = ConfigDict(extra="forbid")

    id: str
    project_id: str
    status: SessionStatus
    created_at: str
    updated_at: str


class HypothesisRecord(BaseModel):
    model_config = ConfigDict(extra="forbid")

    id: str
    session_id: str
    title: str
    summary: str
    status: WorkStatus
    created_at: str
    updated_at: str


class ExperimentRecord(BaseModel):
    model_config = ConfigDict(extra="forbid")

    id: str
    session_id: str
    status: WorkStatus
    title: str
    summary: str
    created_at: str
    updated_at: str


class EvaluationRecord(BaseModel):
    model_config = ConfigDict(extra="forbid")

    id: str
    session_id: str
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


class HypothesisActivityRecord(BaseModel):
    model_config = ConfigDict(extra="forbid")

    id: int
    hypothesis_id: str
    actor: str
    kind: ActivityKind
    body: str
    payload: dict[str, Any] = Field(default_factory=dict)
    created_at: str


class ExperimentActivityRecord(BaseModel):
    model_config = ConfigDict(extra="forbid")

    id: int
    experiment_id: str
    actor: str
    kind: ActivityKind
    body: str
    payload: dict[str, Any] = Field(default_factory=dict)
    created_at: str


class EvaluationActivityRecord(BaseModel):
    model_config = ConfigDict(extra="forbid")

    id: int
    evaluation_id: str
    actor: str
    kind: ActivityKind
    body: str
    payload: dict[str, Any] = Field(default_factory=dict)
    created_at: str


class ArtifactRecord(BaseModel):
    model_config = ConfigDict(extra="forbid")

    id: str
    session_id: str
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
    session_id: str | None = None
    type: str
    message: str
    payload: dict[str, Any] = Field(default_factory=dict)
    created_at: str
