from typing import Any, Literal

from pydantic import BaseModel, ConfigDict, Field


ObjectiveStatus = Literal["active", "closed"]
SessionStatus = Literal["active", "closed"]
WorkStatus = Literal["open", "active", "closed"]
ActivityKind = Literal["comment", "update", "result", "concern", "decision"]


class ProjectConfigRecord(BaseModel):
    model_config = ConfigDict(extra="forbid")

    id: str
    repo_path: str
    evaluation_context: str
    known_signals: list[str]
    experiment_scope: str
    created_at: str
    updated_at: str


class ObjectiveRecord(BaseModel):
    model_config = ConfigDict(extra="forbid")

    id: str
    title: str
    description: str
    status: ObjectiveStatus
    created_at: str
    updated_at: str


class SessionRecord(BaseModel):
    model_config = ConfigDict(extra="forbid")

    id: str
    objective_id: str
    status: SessionStatus
    created_at: str
    updated_at: str


class HypothesisRecord(BaseModel):
    model_config = ConfigDict(extra="forbid")

    id: str
    objective_id: str
    title: str
    summary: str
    status: WorkStatus
    created_at: str
    updated_at: str


class ExperimentRecord(BaseModel):
    model_config = ConfigDict(extra="forbid")

    id: str
    objective_id: str
    status: WorkStatus
    title: str
    summary: str
    created_in_session_id: str | None = None
    created_at: str
    updated_at: str


class HypothesisExperimentLinkRecord(BaseModel):
    model_config = ConfigDict(extra="forbid")

    hypothesis_id: str
    experiment_id: str
    note: str = ""
    created_at: str


class HypothesisActivityRecord(BaseModel):
    model_config = ConfigDict(extra="forbid")

    id: int
    hypothesis_id: str
    session_id: str | None = None
    actor: str
    kind: ActivityKind
    body: str
    payload: dict[str, Any] = Field(default_factory=dict)
    created_at: str


class ExperimentActivityRecord(BaseModel):
    model_config = ConfigDict(extra="forbid")

    id: int
    experiment_id: str
    session_id: str | None = None
    actor: str
    kind: ActivityKind
    body: str
    payload: dict[str, Any] = Field(default_factory=dict)
    created_at: str


class ArtifactRecord(BaseModel):
    model_config = ConfigDict(extra="forbid")

    id: str
    objective_id: str
    session_id: str | None = None
    hypothesis_id: str | None = None
    experiment_id: str | None = None
    hypothesis_activity_id: int | None = None
    experiment_activity_id: int | None = None
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
