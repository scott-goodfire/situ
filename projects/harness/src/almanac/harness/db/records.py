from __future__ import annotations

from typing import Any, Literal

from pydantic import BaseModel, ConfigDict, Field


class DbRecord(BaseModel):
    model_config = ConfigDict(extra="forbid")


class ProjectConfigRecord(DbRecord):
    id: str
    repo_path: str
    goal: str
    evaluation_context: str
    known_signals: list[str]
    experiment_scope: str
    created_at: str
    updated_at: str


class RunRecord(DbRecord):
    id: str
    status: str
    created_at: str
    updated_at: str


class ExperimentRecord(DbRecord):
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


class SignalRecord(DbRecord):
    key: str
    value: Any
    unit: str | None = None


class EvidenceRecord(DbRecord):
    id: int
    run_id: str
    experiment_id: str
    summary: str
    signals: list[SignalRecord] = Field(default_factory=list)
    raw: dict[str, Any] = Field(default_factory=dict)
    created_at: str


FindingConfidence = Literal["low", "medium", "high"]
FindingStatus = Literal["open", "supported", "contradicted"]


class FindingRecord(DbRecord):
    id: str
    run_id: str
    summary: str
    evidence_experiment_ids: list[str]
    confidence: FindingConfidence
    status: FindingStatus
    created_at: str
    updated_at: str


class WarningRecord(DbRecord):
    id: int
    run_id: str
    experiment_id: str | None = None
    kind: str
    message: str
    created_at: str


class EventRecord(DbRecord):
    id: int
    run_id: str | None = None
    type: str
    message: str
    payload: dict[str, Any]
    created_at: str


class AgentMessageHistoryRecord(DbRecord):
    id: int
    run_id: str
    agent_name: str
    pydantic_run_id: str | None = None
    conversation_id: str | None = None
    messages: list[dict[str, Any]]
    message_count: int
    created_at: str
