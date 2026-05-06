from typing import Any

from pydantic import BaseModel, Field


class WorkerInitializeParams(BaseModel):
    protocol_version: int = 1


class WorkerInitializeResult(BaseModel):
    worker_name: str
    protocol_version: int = 1


class ExperimentRunParams(BaseModel):
    session_id: str
    experiment_id: str
    title: str
    summary: str
    components: list[str] = Field(default_factory=list)
    based_on: list[str] = Field(default_factory=list)


class ExperimentRunResult(BaseModel):
    experiment_id: str
    status: str
    summary: str
    signals: list[dict[str, Any]] = Field(default_factory=list)
    raw: dict[str, Any] = Field(default_factory=dict)


class WorkerProgressParams(BaseModel):
    session_id: str
    experiment_id: str
    message: str
    payload: dict[str, Any] = Field(default_factory=dict)
