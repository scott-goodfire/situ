from __future__ import annotations

from typing import Any, Literal

from pydantic import BaseModel, ConfigDict, Field


class RepositoryCommand(BaseModel):
    model_config = ConfigDict(extra="forbid")


class SetProjectConfig(RepositoryCommand):
    goal: str
    evaluation_context: str
    known_signals: list[str] = Field(default_factory=list)
    experiment_scope: str


class CreateRun(RepositoryCommand):
    run_id: str


class UpdateRunStatus(RepositoryCommand):
    run_id: str
    status: str


class CreateExperiment(RepositoryCommand):
    experiment_id: str
    run_id: str
    intent: str
    change_summary: str
    components: list[str] = Field(default_factory=list)
    based_on: list[str] = Field(default_factory=list)


class UpdateExperiment(RepositoryCommand):
    experiment_id: str
    status: str
    suspicious: bool | None = None
    suspicious_reason: str | None = None
    note: str | None = None


class AddEvidence(RepositoryCommand):
    run_id: str
    experiment_id: str
    summary: str
    signals: list[dict[str, Any]] = Field(default_factory=list)
    raw: dict[str, Any] = Field(default_factory=dict)


class UpsertFinding(RepositoryCommand):
    finding_id: str
    run_id: str
    summary: str
    evidence_experiment_ids: list[str] = Field(default_factory=list)
    confidence: Literal["low", "medium", "high"]
    status: Literal["open", "supported", "contradicted"]


class AddWarning(RepositoryCommand):
    run_id: str
    kind: str
    message: str
    experiment_id: str | None = None


class AppendAgentMessageHistory(RepositoryCommand):
    run_id: str
    agent_name: str
    messages_json: str
    pydantic_run_id: str | None = None
    conversation_id: str | None = None


class AddEvent(RepositoryCommand):
    event_type: str
    message: str
    run_id: str | None = None
    payload: dict[str, Any] = Field(default_factory=dict)
