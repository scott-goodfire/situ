from __future__ import annotations

from typing import Any
from uuid import uuid4

import pytest

from situ.harness.api.collections import collection_route_for_record, publish_record_upsert
from situ.harness.core.notifications import (
    register_project_notifications,
    set_project_collections_subscribed,
)
from situ.harness.records import (
    AgentRecord,
    AnalysisActivityRecord,
    AnalysisRecord,
    ArtifactRecord,
    BaselineRecord,
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
from situ.harness.repositories.collection_changes.repository import CollectionChange


class _NonCollectionRecord:
    pass


class _FakeCollectionChanges:
    def __init__(self, change: CollectionChange | None) -> None:
        self.change = change
        self.request: tuple[str, str, str] | None = None

    async def latest_for_record(
        self,
        *,
        scope_id: str,
        collection: str,
        key: str,
    ) -> CollectionChange | None:
        self.request = (scope_id, collection, key)
        return self.change


class _FakeRepos:
    def __init__(self, change: CollectionChange | None) -> None:
        self.collection_changes = _FakeCollectionChanges(change)


def test_collection_routes_cover_publishable_records() -> None:
    records = [
        (workspace_record(), "workspaces", "workspace_0001"),
        (project_record(), "projects", "P1"),
        (session_record(), "sessions", "S1"),
        (hypothesis_record(), "hypotheses", "H1"),
        (baseline_record(), "baselines", "B1"),
        (experiment_record(), "experiments", "EX1"),
        (evaluation_record(), "evaluations", "EV1"),
        (measurement_record(), "measurements", "M7"),
        (analysis_record(), "analyses", "A1"),
        (
            HypothesisExperimentLinkRecord(
                hypothesis_id="H1",
                experiment_id="EX1",
                created_at="now",
            ),
            "hypothesis_experiment_links",
            "H1:EX1",
        ),
        (agent_record(), "agents", "agent_0001"),
        (task_record(), "tasks", "T1"),
        (
            task_dependency_record(),
            "task_dependencies",
            "T2:T1",
        ),
        (
            task_entity_link_record(),
            "task_entity_links",
            "T1:evaluation:EV1:created",
        ),
        (task_activity_record(), "task_activities", "5"),
        (analysis_activity_record(), "analysis_activities", "6"),
        (hypothesis_activity_record(), "hypothesis_activities", "1"),
        (experiment_activity_record(), "experiment_activities", "2"),
        (evaluation_activity_record(), "evaluation_activities", "4"),
        (artifact_record(), "artifacts", "ART1"),
        (event_record(), "events", "3"),
    ]

    for record, collection, key in records:
        route = collection_route_for_record(record)
        assert route.collection == collection
        assert route.key(record) == key


@pytest.mark.asyncio
async def test_collection_publisher_emits_generic_upsert() -> None:
    project_id = f"P{uuid4().int}"
    notifications: list[tuple[str, dict]] = []

    async def notify(method: str, params: dict) -> None:
        notifications.append((method, params))

    register_project_notifications(
        project_id=project_id,
        writer=notify,
    )
    set_project_collections_subscribed(project_id=project_id, subscribed=True)

    await publish_record_upsert(
        project_id=project_id,
        record=project_record(),
        cursor=42,
    )

    assert notifications == [
        (
            "collections.upserted",
            {
                "cursor": 42,
                "collection": "projects",
                "key": "P1",
                "record": project_record().model_dump(),
            },
        )
    ]


@pytest.mark.asyncio
async def test_collection_publisher_emits_trigger_owned_record() -> None:
    scope_id = "workspace_0001"
    notifications: list[tuple[str, dict[str, Any]]] = []

    async def notify(method: str, params: dict[str, Any]) -> None:
        notifications.append((method, params))

    register_project_notifications(
        project_id=scope_id,
        writer=notify,
    )
    set_project_collections_subscribed(project_id=scope_id, subscribed=True)

    stale_record = project_record()
    persisted_record = {
        **stale_record.model_dump(),
        "title": "Persisted title",
    }
    repos = _FakeRepos(
        CollectionChange(
            cursor=7,
            scope_id=scope_id,
            collection="projects",
            key="P1",
            op="upsert",
            record=persisted_record,
            source_event_id=99,
            created_at="now",
        )
    )

    await publish_record_upsert(
        project_id=None,
        scope_id=scope_id,
        record=stale_record,
        cursor=None,
        repos=repos,  # type: ignore[arg-type]
    )

    assert repos.collection_changes.request == (scope_id, "projects", "P1")
    assert notifications == [
        (
            "collections.upserted",
            {
                "cursor": 7,
                "collection": "projects",
                "key": "P1",
                "record": persisted_record,
                "source_event_id": 99,
            },
        )
    ]


@pytest.mark.asyncio
async def test_collection_publisher_missing_outbox_change_is_best_effort() -> None:
    scope_id = "workspace_0001"
    notifications: list[tuple[str, dict[str, Any]]] = []

    async def notify(method: str, params: dict[str, Any]) -> None:
        notifications.append((method, params))

    register_project_notifications(
        project_id=scope_id,
        writer=notify,
    )
    set_project_collections_subscribed(project_id=scope_id, subscribed=True)

    repos = _FakeRepos(None)

    await publish_record_upsert(
        project_id=None,
        scope_id=scope_id,
        record=project_record(),
        cursor=42,
        repos=repos,  # type: ignore[arg-type]
    )

    assert repos.collection_changes.request == (scope_id, "projects", "P1")
    assert notifications == []


@pytest.mark.asyncio
async def test_collection_publisher_notification_errors_are_best_effort() -> None:
    project_id = f"P{uuid4().int}"

    async def notify(_method: str, _params: dict[str, Any]) -> None:
        raise RuntimeError("client disconnected")

    register_project_notifications(
        project_id=project_id,
        writer=notify,
    )
    set_project_collections_subscribed(project_id=project_id, subscribed=True)

    await publish_record_upsert(
        project_id=project_id,
        record=project_record(),
        cursor=42,
    )


def test_collection_route_rejects_non_collection_records() -> None:
    with pytest.raises(TypeError, match="not publishable"):
        collection_route_for_record(_NonCollectionRecord())  # type: ignore[arg-type]


def workspace_record() -> WorkspaceRecord:
    return WorkspaceRecord(
        id="workspace_0001",
        repo_path="/tmp/project",
        created_at="now",
        updated_at="now",
    )


def project_record() -> ProjectRecord:
    return ProjectRecord(
        id="P1",
        workspace_id="workspace_0001",
        title="Improve score",
        objective="Improve score.",
        research_context="Run evals. Expected signals: score.",
        status="active",
        created_at="now",
        updated_at="now",
    )


def session_record() -> SessionRecord:
    return SessionRecord(
        id="S1",
        workspace_id="workspace_0001",
        project_id="P1",
        status="active",
        created_at="now",
        updated_at="now",
    )


def agent_record() -> AgentRecord:
    return AgentRecord(
        id="agent_0001",
        project_id="P1",
        created_in_session_id="S1",
        kind="scientist",
        display_name="Scientist",
        model_name="anthropic:test",
        status="idle",
        created_at="now",
        updated_at="now",
    )


def task_record() -> TaskRecord:
    return TaskRecord(
        id="T1",
        project_id="P1",
        created_in_session_id="S1",
        title="Run baseline",
        content="Run the baseline eval and record evidence.",
        kind="baseline",
        status="backlog",
        priority="high",
        source_kind="manager",
        assignee_id=None,
        parent_task_id=None,
        payload={},
        pydantic_run_id=None,
        conversation_id=None,
        result_summary=None,
        created_at="now",
        available_at="now",
        claimed_in_session_id=None,
        claimed_at=None,
        completed_in_session_id=None,
        completed_at=None,
        updated_at="now",
    )


def task_dependency_record() -> TaskDependencyRecord:
    return TaskDependencyRecord(
        project_id="P1",
        task_id="T2",
        blocked_by_task_id="T1",
        created_at="now",
    )


def task_entity_link_record() -> TaskEntityLinkRecord:
    return TaskEntityLinkRecord(
        project_id="P1",
        task_id="T1",
        entity_kind="evaluation",
        entity_id="EV1",
        relationship="created",
        created_at="now",
    )


def task_activity_record() -> TaskActivityRecord:
    return TaskActivityRecord(
        id=5,
        project_id="P1",
        task_id="T1",
        created_in_session_id="S1",
        actor_agent_id="agent_0001",
        actor="agent",
        kind="comment",
        body="Task claimed.",
        payload={},
        created_at="now",
    )


def hypothesis_record() -> HypothesisRecord:
    return HypothesisRecord(
        id="H1",
        project_id="P1",
        created_in_session_id="S1",
        title="Hypothesis",
        summary="Summary.",
        status="active",
        created_at="now",
        updated_at="now",
    )


def experiment_record() -> ExperimentRecord:
    return ExperimentRecord(
        id="EX1",
        project_id="P1",
        created_in_session_id="S1",
        status="active",
        title="Experiment",
        summary="Summary.",
        created_at="now",
        updated_at="now",
    )


def baseline_record() -> BaselineRecord:
    return BaselineRecord(
        id="B1",
        project_id="P1",
        created_in_session_id="S1",
        status="active",
        title="Baseline",
        summary="Reference state.",
        created_at="now",
        updated_at="now",
    )


def evaluation_record() -> EvaluationRecord:
    return EvaluationRecord(
        id="EV1",
        project_id="P1",
        created_in_session_id="S1",
        status="active",
        title="Baseline eval",
        summary="Run baseline.",
        associated_baseline_id="B1",
        associated_experiment_id=None,
        created_at="now",
        updated_at="now",
    )


def analysis_record() -> AnalysisRecord:
    return AnalysisRecord(
        id="A1",
        project_id="P1",
        created_in_session_id="S1",
        created_by_agent_id="agent_0001",
        status="active",
        title="Codebase map",
        summary="Mapped the main backend primitives.",
        content="The backend stores project-owned research records.",
        supersedes_analysis_id=None,
        created_at="now",
        updated_at="now",
    )


def analysis_activity_record() -> AnalysisActivityRecord:
    return AnalysisActivityRecord(
        id=6,
        analysis_id="A1",
        created_in_session_id="S1",
        actor="agent",
        kind="comment",
        body="This note should feed hypothesis generation.",
        payload={},
        created_at="now",
    )


def hypothesis_activity_record() -> HypothesisActivityRecord:
    return HypothesisActivityRecord(
        id=1,
        hypothesis_id="H1",
        created_in_session_id="S1",
        actor="agent",
        kind="comment",
        body="Comment.",
        payload={},
        created_at="now",
    )


def experiment_activity_record() -> ExperimentActivityRecord:
    return ExperimentActivityRecord(
        id=2,
        experiment_id="EX1",
        created_in_session_id="S1",
        actor="agent",
        kind="comment",
        body="Comment.",
        payload={},
        created_at="now",
    )


def evaluation_activity_record() -> EvaluationActivityRecord:
    return EvaluationActivityRecord(
        id=4,
        evaluation_id="EV1",
        created_in_session_id="S1",
        actor="agent",
        kind="recorded",
        body="Baseline result.",
        payload={"record_type": "trust_finding"},
        created_at="now",
    )


def measurement_record() -> MeasurementRecord:
    return MeasurementRecord(
        id="M7",
        evaluation_id="EV1",
        created_in_session_id="S1",
        actor="agent",
        body="Baseline result.",
        payload={"activity_type": "result"},
        created_at="now",
    )


def artifact_record() -> ArtifactRecord:
    return ArtifactRecord(
        id="ART1",
        project_id="P1",
        created_in_session_id="S1",
        associated_entity_kind="experiment",
        associated_entity_id="EX1",
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
        associated_project_id="P1",
        associated_session_id="S1",
        type="session.started",
        message="Started session.",
        payload={},
        created_at="now",
    )
