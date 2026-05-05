from typing import Any, Literal

from pydantic import BaseModel, ConfigDict

from .events import (
    EventRecord,
    EvidenceRecord,
    ExperimentRecord,
    FindingRecord,
    ProjectConfigRecord,
    RunRecord,
    WarningRecord,
)


class HarnessHelloParams(BaseModel):
    model_config = ConfigDict(extra="forbid")

    name: str = "world"


class HarnessHelloResult(BaseModel):
    model_config = ConfigDict(extra="forbid")

    message: str
    harness: str = "python"


class SetupGetParams(BaseModel):
    model_config = ConfigDict(extra="forbid")


class SetupGetResult(BaseModel):
    model_config = ConfigDict(extra="forbid")

    configured: bool
    config: ProjectConfigRecord | None = None


class SetupCompleteParams(BaseModel):
    model_config = ConfigDict(extra="forbid")

    goal: str
    evaluation_context: str
    known_signals: list[str] = []
    experiment_scope: str = "Toy deterministic experiment loop."


class SetupCompleteResult(BaseModel):
    model_config = ConfigDict(extra="forbid")

    config: ProjectConfigRecord


CollectionName = Literal["runs", "experiments", "events"]


class CollectionsBootstrapParams(BaseModel):
    model_config = ConfigDict(extra="forbid")


class CollectionsBootstrapResult(BaseModel):
    model_config = ConfigDict(extra="forbid")

    cursor: int
    runs: list[RunRecord]
    experiments: list[ExperimentRecord]
    events: list[EventRecord]


class CollectionsSubscribeParams(BaseModel):
    model_config = ConfigDict(extra="forbid")


class CollectionsSubscribeResult(BaseModel):
    model_config = ConfigDict(extra="forbid")

    subscribed: bool
    cursor: int


class CollectionUpsertedParams(BaseModel):
    model_config = ConfigDict(extra="forbid")

    cursor: int
    collection: CollectionName
    key: str
    record: dict[str, Any]


class EventsSubscribeParams(BaseModel):
    model_config = ConfigDict(extra="forbid")

    replay_existing: bool = False


class EventsSubscribeResult(BaseModel):
    model_config = ConfigDict(extra="forbid")

    subscribed: bool
    replayed: int = 0


class RunStartParams(BaseModel):
    model_config = ConfigDict(extra="forbid")

    max_experiments: int = 6


class RunStartResult(BaseModel):
    model_config = ConfigDict(extra="forbid")

    run_id: str
    status: str


class RunStatusParams(BaseModel):
    model_config = ConfigDict(extra="forbid")

    run_id: str


class RunStatusResult(BaseModel):
    model_config = ConfigDict(extra="forbid")

    run: RunRecord | None
