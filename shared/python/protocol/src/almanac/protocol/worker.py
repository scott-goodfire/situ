from typing import Any

from pydantic import BaseModel, ConfigDict

from .events import SignalRecord


class WorkerInitializeParams(BaseModel):
    model_config = ConfigDict(extra="forbid")

    protocol_version: int = 1


class WorkerInitializeResult(BaseModel):
    model_config = ConfigDict(extra="forbid")

    worker_name: str
    protocol_version: int = 1


class ExperimentRunParams(BaseModel):
    model_config = ConfigDict(extra="forbid")

    run_id: str
    experiment_id: str
    intent: str
    components: list[str]
    based_on: list[str] = []


class ExperimentRunResult(BaseModel):
    model_config = ConfigDict(extra="forbid")

    experiment_id: str
    status: str
    summary: str
    signals: list[SignalRecord]
    raw: dict[str, Any]


class WorkerProgressParams(BaseModel):
    model_config = ConfigDict(extra="forbid")

    run_id: str
    experiment_id: str
    message: str
    payload: dict[str, Any] = {}
