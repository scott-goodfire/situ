from typing import Any, Literal

from pydantic import BaseModel, ConfigDict

from .events import (
    ArtifactRecord,
    EventRecord,
    EvaluationActivityRecord,
    EvaluationRecord,
    ExperimentActivityRecord,
    ExperimentRecord,
    HypothesisActivityRecord,
    HypothesisExperimentLinkRecord,
    HypothesisRecord,
    ObjectiveRecord,
    ProjectConfigRecord,
    SessionRecord,
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
    objective: ObjectiveRecord | None = None


class SetupCompleteParams(BaseModel):
    model_config = ConfigDict(extra="forbid")

    objective: str
    research_context: str


class SetupCompleteResult(BaseModel):
    model_config = ConfigDict(extra="forbid")

    config: ProjectConfigRecord
    objective: ObjectiveRecord


CollectionName = Literal[
    "objectives",
    "sessions",
    "hypotheses",
    "experiments",
    "evaluations",
    "hypothesis_experiment_links",
    "hypothesis_activities",
    "experiment_activities",
    "evaluation_activities",
    "artifacts",
    "events",
]


class CollectionsBootstrapParams(BaseModel):
    model_config = ConfigDict(extra="forbid")


class CollectionsBootstrapResult(BaseModel):
    model_config = ConfigDict(extra="forbid")

    cursor: int
    objectives: list[ObjectiveRecord]
    sessions: list[SessionRecord]
    hypotheses: list[HypothesisRecord]
    experiments: list[ExperimentRecord]
    evaluations: list[EvaluationRecord]
    hypothesis_experiment_links: list[HypothesisExperimentLinkRecord]
    hypothesis_activities: list[HypothesisActivityRecord]
    experiment_activities: list[ExperimentActivityRecord]
    evaluation_activities: list[EvaluationActivityRecord]
    artifacts: list[ArtifactRecord]
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


class SessionStartParams(BaseModel):
    model_config = ConfigDict(extra="forbid")

    max_experiments: int = 6


class SessionStartResult(BaseModel):
    model_config = ConfigDict(extra="forbid")

    session_id: str
    status: str


class SessionStatusParams(BaseModel):
    model_config = ConfigDict(extra="forbid")

    session_id: str


class SessionStatusResult(BaseModel):
    model_config = ConfigDict(extra="forbid")

    session: SessionRecord | None
