from typing import Any, Literal

from pydantic import BaseModel, ConfigDict


class ProjectConfigRecord(BaseModel):
    model_config = ConfigDict(extra="forbid")

    id: str
    repo_path: str
    goal: str
    evaluation_context: str
    known_signals: list[str]
    experiment_scope: str
    created_at: str
    updated_at: str


class RunRecord(BaseModel):
    model_config = ConfigDict(extra="forbid")

    id: str
    status: str
    created_at: str
    updated_at: str


class ExperimentRecord(BaseModel):
    model_config = ConfigDict(extra="forbid")

    id: str
    run_id: str
    status: str
    intent: str
    change_summary: str
    components: list[str]
    based_on: list[str]
    suspicious: bool = False
    suspicious_reason: str | None = None
    note: str = ""
    created_at: str
    updated_at: str


class SignalRecord(BaseModel):
    model_config = ConfigDict(extra="forbid")

    key: str
    value: Any
    unit: str | None = None


class EvidenceRecord(BaseModel):
    model_config = ConfigDict(extra="forbid")

    id: int
    run_id: str
    experiment_id: str
    summary: str
    signals: list[SignalRecord]
    raw: dict[str, Any]
    created_at: str


class FindingRecord(BaseModel):
    model_config = ConfigDict(extra="forbid")

    id: str
    run_id: str
    summary: str
    evidence_experiment_ids: list[str]
    confidence: Literal["low", "medium", "high"]
    status: Literal["open", "supported", "contradicted"]
    created_at: str
    updated_at: str


class WarningRecord(BaseModel):
    model_config = ConfigDict(extra="forbid")

    id: int
    run_id: str
    experiment_id: str | None = None
    kind: str
    message: str
    created_at: str


class EventRecord(BaseModel):
    model_config = ConfigDict(extra="forbid")

    id: int
    run_id: str | None = None
    type: str
    message: str
    payload: dict[str, Any]
    created_at: str
