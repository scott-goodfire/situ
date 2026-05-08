from __future__ import annotations

from ...records import RecordStatus
from ...repositories import Repositories
from .events import publish_record, record_event


async def record_selected_patch_handoff(
    *,
    repos: Repositories,
    session_id: str,
    project_id: str,
) -> str | None:
    """Record the latest continued reviewed candidate patch at clean drain."""
    existing = [
        event
        for event in await repos.events.list_for_session(session_id=session_id)
        if event.type == "session.selected_patch"
        and event.associated_project_id == project_id
    ]
    if existing:
        artifact_id = existing[-1].payload.get("artifact_id")
        return artifact_id if isinstance(artifact_id, str) else None

    selected = await _latest_continue_decision(
        repos=repos,
        project_id=project_id,
    )
    if selected is None:
        return None

    experiment_id = selected
    patches = [
        artifact
        for artifact in await repos.artifacts.list_for_experiment(
            experiment_id=experiment_id,
        )
        if artifact.kind == "patch"
    ]
    if not patches:
        return None
    artifact = patches[-1]
    activity = await repos.experiment_activities.add(
        experiment_id=experiment_id,
        created_in_session_id=session_id,
        actor="harness",
        kind="recorded",
        body=(
            f"Selected {artifact.id} from {experiment_id} as the current best "
            f"patch handoff. Apply explicitly with `situ apply {artifact.id}`."
        ),
        payload={
            "record_type": "selected_patch",
            "artifact_id": artifact.id,
            "experiment_id": experiment_id,
            "apply_command": f"situ apply {artifact.id}",
        },
    )
    event = await record_event(
        repos=repos,
        event_type="session.selected_patch",
        message=f"Selected patch artifact {artifact.id} from {experiment_id}",
        session_id=session_id,
        project_id=project_id,
        payload={
            "artifact_id": artifact.id,
            "experiment_id": experiment_id,
            "apply_command": f"situ apply {artifact.id}",
        },
    )
    await publish_record(
        repos=repos,
        project_id=project_id,
        record=activity,
        cursor=event.id,
    )
    return artifact.id


async def _latest_continue_decision(
    *,
    repos: Repositories,
    project_id: str,
) -> str | None:
    activities = await repos.experiment_activities.list_for_project(
        project_id=project_id,
    )
    for activity in reversed(activities):
        payload = activity.payload or {}
        if payload.get("record_type") != "lineage_decision":
            continue
        if payload.get("decision") != "continue":
            continue
        experiment = await repos.experiments.get(experiment_id=activity.experiment_id)
        if experiment is None or experiment.project_id != project_id:
            continue
        if experiment.status not in {RecordStatus.DONE, RecordStatus.ACCEPTED}:
            continue
        return experiment.id
    return None
