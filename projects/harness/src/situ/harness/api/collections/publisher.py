from __future__ import annotations

from dataclasses import dataclass
from typing import Callable

from ...core.notifications import emit_collection_upsert
from ...records import (
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
    ProjectRecord,
    ResearchContextRecord,
    SessionRecord,
)
from ...records.base import DbRecord


@dataclass(frozen=True)
class CollectionRoute:
    collection: str
    key: Callable[[DbRecord], str]


def _record_id(record: DbRecord) -> str:
    return str(getattr(record, "id"))


def _hypothesis_experiment_link_key(record: DbRecord) -> str:
    link = record
    if not isinstance(link, HypothesisExperimentLinkRecord):
        raise TypeError(f"expected HypothesisExperimentLinkRecord, got {type(record).__name__}")
    return f"{link.hypothesis_id}:{link.experiment_id}"


COLLECTION_ROUTES: dict[type[DbRecord], CollectionRoute] = {
    ProjectRecord: CollectionRoute("projects", _record_id),
    ObjectiveRecord: CollectionRoute("objectives", _record_id),
    ResearchContextRecord: CollectionRoute("research_contexts", _record_id),
    SessionRecord: CollectionRoute("sessions", _record_id),
    HypothesisRecord: CollectionRoute("hypotheses", _record_id),
    ExperimentRecord: CollectionRoute("experiments", _record_id),
    EvaluationRecord: CollectionRoute("evaluations", _record_id),
    HypothesisExperimentLinkRecord: CollectionRoute(
        "hypothesis_experiment_links",
        _hypothesis_experiment_link_key,
    ),
    HypothesisActivityRecord: CollectionRoute("hypothesis_activities", _record_id),
    ExperimentActivityRecord: CollectionRoute("experiment_activities", _record_id),
    EvaluationActivityRecord: CollectionRoute("evaluation_activities", _record_id),
    ArtifactRecord: CollectionRoute("artifacts", _record_id),
    EventRecord: CollectionRoute("events", _record_id),
}


def publish_record_upsert(
    *,
    project_id: str | None,
    record: DbRecord,
    cursor: int | None,
) -> None:
    route = collection_route_for_record(record)
    emit_collection_upsert(
        project_id,
        route.collection,
        route.key(record),
        record.model_dump(),
        cursor=cursor,
    )


def collection_route_for_record(record: DbRecord) -> CollectionRoute:
    for record_type, route in COLLECTION_ROUTES.items():
        if isinstance(record, record_type):
            return route
    raise TypeError(f"record is not publishable as a collection: {type(record).__name__}")
