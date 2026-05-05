from __future__ import annotations

from uuid import uuid4

import pytest

from almanac.harness.api.collections import collection_route_for_record, publish_record_upsert
from almanac.harness.core.notifications import (
    register_project_notifications,
    set_project_collections_subscribed,
)
from almanac.harness.records import (
    ArtifactRecord,
    EventRecord,
    ExperimentActivityRecord,
    ExperimentRecord,
    HypothesisActivityRecord,
    HypothesisExperimentLinkRecord,
    HypothesisRecord,
    ObjectiveRecord,
    ProjectConfigRecord,
    SessionRecord,
)


def test_collection_routes_cover_publishable_records() -> None:
    records = [
        (objective_record(), "objectives", "objective_0001"),
        (session_record(), "sessions", "session_0001"),
        (hypothesis_record(), "hypotheses", "hyp_0001"),
        (experiment_record(), "experiments", "exp_0001"),
        (
            HypothesisExperimentLinkRecord(
                hypothesis_id="hyp_0001",
                experiment_id="exp_0001",
                created_at="now",
            ),
            "hypothesis_experiment_links",
            "hyp_0001:exp_0001",
        ),
        (hypothesis_activity_record(), "hypothesis_activities", "1"),
        (experiment_activity_record(), "experiment_activities", "2"),
        (artifact_record(), "artifacts", "artifact_0001"),
        (event_record(), "events", "3"),
    ]

    for record, collection, key in records:
        route = collection_route_for_record(record)
        assert route.collection == collection
        assert route.key(record) == key


def test_collection_publisher_emits_generic_upsert() -> None:
    project_id = f"project_{uuid4().hex}"
    notifications: list[tuple[str, dict]] = []
    register_project_notifications(
        project_id,
        lambda method, params: notifications.append((method, params)),
    )
    set_project_collections_subscribed(project_id, True)

    publish_record_upsert(
        project_id=project_id,
        record=objective_record(),
        cursor=42,
    )

    assert notifications == [
        (
            "collections.upserted",
            {
                "cursor": 42,
                "collection": "objectives",
                "key": "objective_0001",
                "record": objective_record().model_dump(),
            },
        )
    ]


def test_collection_route_rejects_non_collection_records() -> None:
    with pytest.raises(TypeError, match="not publishable"):
        collection_route_for_record(
            ProjectConfigRecord(
                id="project_0001",
                repo_path="/tmp/project",
                research_context="Run evals.",
                associated_session_id=None,
                created_at="now",
                updated_at="now",
            )
        )


def objective_record() -> ObjectiveRecord:
    return ObjectiveRecord(
        id="objective_0001",
        title="Improve score",
        description="Improve score.",
        status="active",
        associated_session_id=None,
        created_at="now",
        updated_at="now",
    )


def session_record() -> SessionRecord:
    return SessionRecord(
        id="session_0001",
        objective_id="objective_0001",
        status="active",
        created_at="now",
        updated_at="now",
    )


def hypothesis_record() -> HypothesisRecord:
    return HypothesisRecord(
        id="hyp_0001",
        objective_id="objective_0001",
        title="Hypothesis",
        summary="Summary.",
        status="active",
        associated_session_id="session_0001",
        created_at="now",
        updated_at="now",
    )


def experiment_record() -> ExperimentRecord:
    return ExperimentRecord(
        id="exp_0001",
        objective_id="objective_0001",
        status="active",
        title="Experiment",
        summary="Summary.",
        associated_session_id="session_0001",
        created_at="now",
        updated_at="now",
    )


def hypothesis_activity_record() -> HypothesisActivityRecord:
    return HypothesisActivityRecord(
        id=1,
        hypothesis_id="hyp_0001",
        session_id="session_0001",
        actor="agent",
        kind="comment",
        body="Comment.",
        payload={},
        created_at="now",
    )


def experiment_activity_record() -> ExperimentActivityRecord:
    return ExperimentActivityRecord(
        id=2,
        experiment_id="exp_0001",
        session_id="session_0001",
        actor="agent",
        kind="comment",
        body="Comment.",
        payload={},
        created_at="now",
    )


def artifact_record() -> ArtifactRecord:
    return ArtifactRecord(
        id="artifact_0001",
        objective_id="objective_0001",
        associated_session_id="session_0001",
        associated_entity_kind="experiment",
        associated_entity_id="exp_0001",
        kind="json",
        title="Raw output",
        path="artifacts/raw.json",
        media_type="application/json",
        size_bytes=10,
        created_at="now",
    )


def event_record() -> EventRecord:
    return EventRecord(
        id=3,
        session_id="session_0001",
        type="session.started",
        message="Started session.",
        payload={},
        created_at="now",
    )
