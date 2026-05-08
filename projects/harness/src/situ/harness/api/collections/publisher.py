from __future__ import annotations

from dataclasses import dataclass
from typing import TYPE_CHECKING, Callable

import logfire

from ...core.notifications import emit_collection_upsert
from ...records import (
    AgentRecord,
    AnalysisActivityRecord,
    AnalysisRecord,
    ArtifactRecord,
    BaselineActivityRecord,
    BaselineRecord,
    ComputeTargetRecord,
    EventRecord,
    EvaluationActivityRecord,
    EvaluationRecord,
    ExperimentActivityRecord,
    ExperimentRecord,
    HypothesisActivityRecord,
    HypothesisExperimentLinkRecord,
    HypothesisRecord,
    MeasurementRecord,
    ProjectRecord,
    SessionRecord,
    TaskActivityRecord,
    TaskDependencyRecord,
    TaskEntityLinkRecord,
    TaskRecord,
    WorkspaceRecord,
)
from ...records.base import DbRecord

if TYPE_CHECKING:
    from ...repositories import Repositories


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


def _task_dependency_key(record: DbRecord) -> str:
    dependency = record
    if not isinstance(dependency, TaskDependencyRecord):
        raise TypeError(f"expected TaskDependencyRecord, got {type(record).__name__}")
    return f"{dependency.task_id}:{dependency.blocked_by_task_id}"


def _task_entity_link_key(record: DbRecord) -> str:
    link = record
    if not isinstance(link, TaskEntityLinkRecord):
        raise TypeError(f"expected TaskEntityLinkRecord, got {type(record).__name__}")
    return f"{link.task_id}:{link.entity_kind}:{link.entity_id}:{link.relationship}"


COLLECTION_ROUTES: dict[type[DbRecord], CollectionRoute] = {
    WorkspaceRecord: CollectionRoute("workspaces", _record_id),
    ProjectRecord: CollectionRoute("projects", _record_id),
    SessionRecord: CollectionRoute("sessions", _record_id),
    HypothesisRecord: CollectionRoute("hypotheses", _record_id),
    BaselineRecord: CollectionRoute("baselines", _record_id),
    ExperimentRecord: CollectionRoute("experiments", _record_id),
    EvaluationRecord: CollectionRoute("evaluations", _record_id),
    MeasurementRecord: CollectionRoute("measurements", _record_id),
    HypothesisExperimentLinkRecord: CollectionRoute(
        "hypothesis_experiment_links",
        _hypothesis_experiment_link_key,
    ),
    AgentRecord: CollectionRoute("agents", _record_id),
    TaskRecord: CollectionRoute("tasks", _record_id),
    TaskDependencyRecord: CollectionRoute("task_dependencies", _task_dependency_key),
    TaskEntityLinkRecord: CollectionRoute("task_entity_links", _task_entity_link_key),
    TaskActivityRecord: CollectionRoute("task_activities", _record_id),
    AnalysisRecord: CollectionRoute("analyses", _record_id),
    AnalysisActivityRecord: CollectionRoute("analysis_activities", _record_id),
    HypothesisActivityRecord: CollectionRoute("hypothesis_activities", _record_id),
    BaselineActivityRecord: CollectionRoute("baseline_activities", _record_id),
    ExperimentActivityRecord: CollectionRoute("experiment_activities", _record_id),
    EvaluationActivityRecord: CollectionRoute("evaluation_activities", _record_id),
    ArtifactRecord: CollectionRoute("artifacts", _record_id),
    EventRecord: CollectionRoute("events", _record_id),
    ComputeTargetRecord: CollectionRoute("compute_targets", _record_id),
}


async def publish_record_upsert(
    *,
    project_id: str | None,
    record: DbRecord,
    cursor: int | None,
    repos: Repositories | None = None,
    scope_id: str | None = None,
) -> None:
    route = collection_route_for_record(record)
    key = route.key(record)
    record_dump = record.model_dump()
    resolved_scope_id = scope_id or project_id
    change_cursor = cursor
    source_event_id = None
    if repos is not None and resolved_scope_id is not None:
        try:
            change = await repos.collection_changes.latest_for_record(
                scope_id=resolved_scope_id,
                collection=route.collection,
                key=key,
            )
        except Exception as error:
            logfire.warning(
                "collection change lookup failed collection={collection} "
                "key={key} scope_id={scope_id} error={error}",
                collection=route.collection,
                key=key,
                scope_id=resolved_scope_id,
                error=str(error),
            )
            return
        if change is None:
            logfire.warning(
                "collection change was not persisted for "
                "{collection}:{key} in scope {scope_id}",
                collection=route.collection,
                key=key,
                scope_id=resolved_scope_id,
            )
            return
        if change.op != "upsert" or change.record is None:
            logfire.warning(
                "latest collection change is not an upsert for "
                "{collection}:{key} in scope {scope_id}",
                collection=route.collection,
                key=key,
                scope_id=resolved_scope_id,
            )
            return
        change_cursor = change.cursor
        record_dump = change.record
        source_event_id = change.source_event_id
    try:
        await emit_collection_upsert(
            project_id=resolved_scope_id,
            collection=route.collection,
            key=key,
            record=record_dump,
            cursor=change_cursor,
            source_event_id=source_event_id,
        )
    except Exception as error:
        logfire.warning(
            "collection upsert notification failed collection={collection} "
            "key={key} scope_id={scope_id} error={error}",
            collection=route.collection,
            key=key,
            scope_id=resolved_scope_id,
            error=str(error),
        )


def collection_route_for_record(record: DbRecord) -> CollectionRoute:
    for record_type, route in COLLECTION_ROUTES.items():
        if isinstance(record, record_type):
            return route
    raise TypeError(f"record is not publishable as a collection: {type(record).__name__}")
