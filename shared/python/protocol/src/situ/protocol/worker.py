from typing import Any

from pydantic import BaseModel, ConfigDict, Field


class WorkerInitializeParams(BaseModel):
    model_config = ConfigDict(extra="forbid")

    protocol_version: int = 1


class WorkerInitializeResult(BaseModel):
    model_config = ConfigDict(extra="forbid")

    worker_name: str
    protocol_version: int = 1


class ExperimentRunParams(BaseModel):
    model_config = ConfigDict(extra="forbid")

    session_id: str
    experiment_id: str
    title: str
    summary: str
    components: list[str] = Field(default_factory=list)
    based_on: list[str] = Field(default_factory=list)


class ExperimentRunResult(BaseModel):
    model_config = ConfigDict(extra="forbid")

    experiment_id: str
    status: str
    summary: str
    signals: list[dict[str, Any]] = Field(default_factory=list)
    raw: dict[str, Any] = Field(default_factory=dict)


class WorkerProgressParams(BaseModel):
    model_config = ConfigDict(extra="forbid")

    session_id: str
    experiment_id: str
    message: str
    payload: dict[str, Any] = Field(default_factory=dict)
