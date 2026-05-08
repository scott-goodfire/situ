from __future__ import annotations

from dataclasses import dataclass
from pathlib import Path
from typing import Any

import aiofiles
import aiofiles.os

from ...records import (
    ExperimentRecord,
    RecordStatus,
    SessionStatus,
    TaskEntityKind,
    TaskRecord,
)
from ...repositories import Repositories
from ...repositories.artifacts.repository import ARTIFACT_ID_ALLOCATION_LOCK
from ..git import git_lines, git_stdout, git_text
from ..project_context import ProjectContext
from ..worktrees import WorktreeManager
from .events import publish_record, record_event

EXPERIMENT_BASE_SELECTORS = {
    "selected_checkout",
    "parent_experiment",
    "explicit_commit",
}


@dataclass(frozen=True, slots=True)
class PreparedExperimentTask:
    task: TaskRecord
    experiment: ExperimentRecord
    repo_path: str


def _experiment_id_from_task(task: TaskRecord) -> str | None:
    experiment_id = task.payload.get("experiment_id")
    return experiment_id if isinstance(experiment_id, str) and experiment_id else None


def _parent_experiment_id_from_task(task: TaskRecord) -> str | None:
    parent_experiment_id = task.payload.get("parent_experiment_id")
    if not isinstance(parent_experiment_id, str) or not parent_experiment_id:
        parent_experiment_id = task.payload.get("base_experiment_id")
    return (
        parent_experiment_id
        if isinstance(parent_experiment_id, str) and parent_experiment_id
        else None
    )


def _base_commit_from_task(task: TaskRecord) -> str | None:
    base_commit = task.payload.get("base_commit")
    return base_commit if isinstance(base_commit, str) and base_commit else None


def _base_selector_from_task(task: TaskRecord) -> str | None:
    base_selector = task.payload.get("base_selector")
    return base_selector if isinstance(base_selector, str) and base_selector else None


def _research_thread_from_task(task: TaskRecord) -> str | None:
    research_thread = task.payload.get("research_thread")
    if not isinstance(research_thread, str) or not research_thread:
        research_thread = task.payload.get("thread")
    return research_thread if isinstance(research_thread, str) and research_thread else None


def _base_commit_from_parent_experiment(
    parent_experiment: ExperimentRecord | None,
) -> str:
    if parent_experiment is None:
        raise RuntimeError(
            "experiment task selected parent_experiment base but did not provide "
            "parent_experiment_id"
        )
    base_commit = parent_experiment.candidate_commit or parent_experiment.base_commit
    if base_commit is None:
        raise RuntimeError(
            f"parent experiment {parent_experiment.id} has no candidate or base commit"
        )
    return base_commit


def _requested_base_commit_from_task(
    task: TaskRecord,
    parent_experiment: ExperimentRecord | None,
) -> str | None:
    base_selector = _base_selector_from_task(task)
    if base_selector is not None and base_selector not in EXPERIMENT_BASE_SELECTORS:
        allowed = ", ".join(sorted(EXPERIMENT_BASE_SELECTORS))
        raise RuntimeError(
            f"invalid experiment base_selector: {base_selector!r}; use one of {allowed}"
        )

    if base_selector == "selected_checkout":
        return None
    if base_selector == "parent_experiment":
        return _base_commit_from_parent_experiment(parent_experiment)
    if base_selector == "explicit_commit":
        base_commit = _base_commit_from_task(task)
        if base_commit is None:
            raise RuntimeError(
                "experiment task selected explicit_commit base but did not provide base_commit"
            )
        return base_commit

    base_commit = _base_commit_from_task(task)
    if base_commit is not None:
        return base_commit
    if parent_experiment is not None:
        return _base_commit_from_parent_experiment(parent_experiment)
    return None


def _artifact_path_for_record(*, artifact_path: Path, project_dir: Path) -> str:
    try:
        return str(artifact_path.relative_to(project_dir))
    except ValueError:
        return str(artifact_path)


async def prepare_experiment_task(
    *,
    repos: Repositories,
    context: ProjectContext,
    task: TaskRecord,
    session_id: str,
    workspace_repo_path: str,
) -> PreparedExperimentTask:
    experiment_id = _experiment_id_from_task(task) or await repos.experiments.next_id(
        project_id=task.project_id
    )
    existing = await repos.experiments.get(experiment_id=experiment_id)
    parent_experiment_id = (
        existing.parent_experiment_id
        if existing is not None and existing.parent_experiment_id is not None
        else _parent_experiment_id_from_task(task)
    )
    parent_experiment = None
    if parent_experiment_id is not None:
        parent_experiment = await repos.experiments.get(
            experiment_id=parent_experiment_id
        )
        if parent_experiment is None or parent_experiment.project_id != task.project_id:
            raise RuntimeError(
                f"experiment task references unknown parent experiment: "
                f"{parent_experiment_id}"
            )
    research_thread = (
        existing.research_thread
        if existing is not None and existing.research_thread is not None
        else _research_thread_from_task(task)
        or (parent_experiment.research_thread if parent_experiment is not None else None)
    )
    requested_base_commit = (
        existing.base_commit
        if existing is not None and existing.base_commit is not None
        else _requested_base_commit_from_task(task, parent_experiment)
    )
    worktree = await WorktreeManager(
        workspace_path=Path(workspace_repo_path),
        worktrees_dir=context.project_dir / "worktrees" / task.project_id,
    ).prepare(
        experiment_id=experiment_id,
        existing_worktree_path=existing.worktree_path if existing is not None else None,
        existing_base_commit=existing.base_commit if existing is not None else None,
        requested_base_commit=requested_base_commit,
    )

    if existing is None:
        experiment = await repos.experiments.create(
            experiment_id=experiment_id,
            project_id=task.project_id,
            created_in_session_id=session_id,
            title=task.title,
            summary=task.content,
            status=RecordStatus.ACTIVE,
            worktree_path=str(worktree.workspace_path),
            base_commit=worktree.base_commit,
            parent_experiment_id=parent_experiment_id,
            research_thread=research_thread,
        )
        event = await record_event(
            repos,
            event_type="experiment.created",
            message=f"Created experiment {experiment.id}",
            session_id=session_id,
            project_id=task.project_id,
            payload={"experiment_id": experiment.id},
        )
        await publish_record(repos=repos, project_id=task.project_id, record=experiment, cursor=event.id)
    else:
        experiment = (
            await repos.experiments.update(
                experiment_id=experiment_id,
                status=RecordStatus.ACTIVE,
                worktree_path=str(worktree.workspace_path),
                base_commit=worktree.base_commit,
                parent_experiment_id=parent_experiment_id,
                research_thread=research_thread,
            )
            or existing
        )

    link = await repos.task_entity_links.create(
        project_id=task.project_id,
        task_id=task.id,
        entity_kind=TaskEntityKind.EXPERIMENT,
        entity_id=experiment.id,
        relationship="produces",
    )
    hypothesis_ids = await experiment_task_hypothesis_ids(repos=repos, task=task)
    hypothesis_experiment_links = [
        await repos.hypothesis_experiment_links.create(
            hypothesis_id=hypothesis_id,
            experiment_id=experiment.id,
        )
        for hypothesis_id in hypothesis_ids
    ]
    updated_task = (
        await repos.tasks.update(
            task_id=task.id,
            payload={
                **task.payload,
                "experiment_id": experiment.id,
                "worktree_path": str(worktree.workspace_path),
                "base_commit": worktree.base_commit,
                **(
                    {"parent_experiment_id": parent_experiment_id}
                    if parent_experiment_id is not None
                    else {}
                ),
                **(
                    {"research_thread": research_thread}
                    if research_thread is not None
                    else {}
                ),
                **({"hypothesis_ids": hypothesis_ids} if hypothesis_ids else {}),
            },
        )
        or task
    )
    event = await record_event(
        repos,
        event_type="experiment.worktree_ready",
        message=f"Prepared worktree for {experiment.id}",
        session_id=session_id,
        project_id=task.project_id,
        payload={
            "experiment_id": experiment.id,
            "task_id": task.id,
            "worktree_path": str(worktree.workspace_path),
            "worktree_root": str(worktree.worktree_root),
            "base_commit": worktree.base_commit,
            "parent_experiment_id": parent_experiment_id,
            "research_thread": research_thread,
            "hypothesis_ids": hypothesis_ids,
        },
    )
    await publish_record(repos=repos, project_id=task.project_id, record=experiment, cursor=event.id)
    await publish_record(repos=repos, project_id=task.project_id, record=link, cursor=event.id)
    for hypothesis_experiment_link in hypothesis_experiment_links:
        await publish_record(
            repos=repos,
            project_id=task.project_id,
            record=hypothesis_experiment_link,
            cursor=event.id,
        )
    await publish_record(repos=repos, project_id=task.project_id, record=updated_task, cursor=event.id)
    return PreparedExperimentTask(
        task=updated_task,
        experiment=experiment,
        repo_path=str(worktree.workspace_path),
    )


async def experiment_task_hypothesis_ids(
    *,
    repos: Repositories,
    task: TaskRecord,
) -> list[str]:
    ids: list[str] = []
    for item in _payload_hypothesis_ids(task.payload):
        if item not in ids:
            ids.append(item)
    for link in await repos.task_entity_links.list_for_task(task_id=task.id):
        if link.entity_kind == TaskEntityKind.HYPOTHESIS and link.entity_id not in ids:
            ids.append(link.entity_id)

    valid_ids: list[str] = []
    for hypothesis_id in ids:
        hypothesis = await repos.hypotheses.get(hypothesis_id=hypothesis_id)
        if (
            hypothesis is not None
            and hypothesis.project_id == task.project_id
            and hypothesis.status in {RecordStatus.ACCEPTED, RecordStatus.ACTIVE}
        ):
            valid_ids.append(hypothesis_id)
    return valid_ids


def _payload_hypothesis_ids(payload: dict[str, Any]) -> list[str]:
    raw = payload.get("hypothesis_ids")
    if raw is None:
        raw = payload.get("hypothesis_id")
    if isinstance(raw, str):
        items = [raw]
    elif isinstance(raw, list | tuple | set):
        items = list(raw)
    else:
        items = []
    return [
        item.strip()
        for item in items
        if isinstance(item, str) and item.strip()
    ]


async def capture_experiment_task_result(
    *,
    repos: Repositories,
    context: ProjectContext,
    experiment_id: str,
    session_id: str,
    workspace_repo_path: str,
) -> None:
    session = await repos.sessions.get(session_id=session_id)
    if session is None or session.status != SessionStatus.ACTIVE:
        return

    experiment = await repos.experiments.get(experiment_id=experiment_id)
    if experiment is None:
        return

    state: dict[str, object]
    candidate_commit: str | None = None
    candidate_ref: str | None = None
    patch_artifact_id: str | None = None
    patch_error: str | None = None
    post_commit_state: dict[str, object] | None = None
    if experiment.worktree_path is None:
        state = {"error": "experiment has no worktree_path"}
    else:
        try:
            candidate_state = await WorktreeManager(
                workspace_path=Path(workspace_repo_path),
                worktrees_dir=context.project_dir / "worktrees" / experiment.project_id,
            ).capture_candidate_state(
                Path(experiment.worktree_path),
                experiment_id=experiment.id,
                base_commit=experiment.base_commit,
            )
            state = candidate_state.worktree.model_dump()
            candidate_commit = candidate_state.candidate_commit
            candidate_ref = candidate_state.candidate_ref
            post_commit_state = candidate_state.post_commit_worktree.model_dump()
            if candidate_commit is not None:
                patch_artifact_id = await _capture_experiment_patch_artifact(
                    repos,
                    context,
                    experiment=experiment,
                    session_id=session_id,
                    candidate_commit=candidate_commit,
                    candidate_ref=candidate_ref,
                )
        except RuntimeError as error:
            state = {"error": str(error), "workspace": experiment.worktree_path}
            patch_error = str(error)

    activity_payload: dict[str, Any] = {
        "activity_type": "workspace_state",
        "base_commit": experiment.base_commit,
        "candidate_commit": candidate_commit,
        "candidate_ref": candidate_ref,
        "worktree": state,
    }
    if patch_artifact_id is not None:
        activity_payload["patch_artifact_id"] = patch_artifact_id
    if patch_error is not None:
        activity_payload["patch_error"] = patch_error
    if post_commit_state is not None:
        activity_payload["post_commit_worktree"] = post_commit_state

    activity = await repos.experiment_activities.add(
        experiment_id=experiment.id,
        created_in_session_id=session_id,
        actor="harness",
        kind="comment",
        body=f"Captured final worktree state for {experiment.id}.",
        payload=activity_payload,
    )
    updated = await repos.experiments.update(
        experiment_id=experiment.id,
        candidate_commit=candidate_commit,
    ) or experiment
    event = await record_event(
        repos,
        event_type="experiment.worktree_captured",
        message=f"Captured final worktree state for {experiment.id}",
        session_id=session_id,
        project_id=experiment.project_id,
        payload={
            "experiment_id": experiment.id,
            "activity_id": activity.id,
            "dirty": state.get("dirty") if isinstance(state, dict) else None,
            "candidate_commit": candidate_commit,
        },
    )
    await publish_record(repos=repos, project_id=experiment.project_id, record=activity, cursor=event.id)
    await publish_record(repos=repos, project_id=experiment.project_id, record=updated, cursor=event.id)


async def _capture_experiment_patch_artifact(
    repos: Repositories,
    context: ProjectContext,
    *,
    experiment: ExperimentRecord,
    session_id: str,
    candidate_commit: str,
    candidate_ref: str | None,
) -> str | None:
    if experiment.base_commit is None or experiment.worktree_path is None:
        return None

    worktree_path = Path(experiment.worktree_path)
    git_root = await git_text(worktree_path, "rev-parse", "--show-toplevel")
    if not git_root:
        raise RuntimeError(
            f"could not resolve git root for experiment {experiment.id}"
        )

    patch = await git_stdout(
        Path(git_root),
        "diff",
        "--binary",
        experiment.base_commit,
        candidate_commit,
    )
    changed_files = await git_lines(
        Path(git_root),
        "diff",
        "--name-only",
        experiment.base_commit,
        candidate_commit,
    )
    diff_stat = await git_text(
        Path(git_root),
        "diff",
        "--stat",
        experiment.base_commit,
        candidate_commit,
    )
    if not patch.strip():
        return None

    async with ARTIFACT_ID_ALLOCATION_LOCK:
        artifact_id = await repos.artifacts.next_id(project_id=experiment.project_id)
        patch_dir = (
            context.project_dir / "artifacts" / "patches" / experiment.project_id
        )
        await aiofiles.os.makedirs(patch_dir, exist_ok=True)
        patch_path = patch_dir / f"{artifact_id}-{experiment.id}.patch"
        async with aiofiles.open(patch_path, "w", encoding="utf-8") as file:
            await file.write(patch)

        artifact = await repos.artifacts.create(
            artifact_id=artifact_id,
            project_id=experiment.project_id,
            created_in_session_id=session_id,
            associated_entity_kind="experiment",
            associated_entity_id=experiment.id,
            kind="patch",
            title=f"Patch handoff from {experiment.id}",
            path=_artifact_path_for_record(
                artifact_path=patch_path,
                project_dir=context.project_dir,
            ),
            media_type="text/x-patch",
            size_bytes=patch_path.stat().st_size,
        )
    linked_tasks = await repos.task_entity_links.list_for_entity(
        entity_kind=TaskEntityKind.EXPERIMENT,
        entity_id=experiment.id,
    )
    artifact_links = [
        await repos.task_entity_links.create(
            project_id=experiment.project_id,
            task_id=link.task_id,
            entity_kind=TaskEntityKind.ARTIFACT,
            entity_id=artifact.id,
            relationship="produces",
        )
        for link in linked_tasks
    ]
    activity = await repos.experiment_activities.add(
        experiment_id=experiment.id,
        created_in_session_id=session_id,
        actor="harness",
        kind="comment",
        body=(
            f"Captured patch artifact {artifact.id} from {experiment.id}. "
            f"Apply explicitly with `situ apply {artifact.id}`."
        ),
        payload={
            "activity_type": "patch_handoff",
            "patch_status": "captured",
            "artifact_id": artifact.id,
            "base_commit": experiment.base_commit,
            "candidate_commit": candidate_commit,
            "candidate_ref": candidate_ref,
            "changed_files": changed_files,
            "diff_stat": diff_stat,
            "apply_command": f"situ apply {artifact.id}",
        },
    )
    event = await record_event(
        repos,
        event_type="experiment.patch_captured",
        message=f"Captured patch artifact {artifact.id} from {experiment.id}",
        session_id=session_id,
        project_id=experiment.project_id,
        payload={
            "experiment_id": experiment.id,
            "artifact_id": artifact.id,
            "changed_files": changed_files,
            "candidate_commit": candidate_commit,
        },
    )
    await publish_record(repos=repos, project_id=experiment.project_id, record=artifact, cursor=event.id)
    for link in artifact_links:
        await publish_record(repos=repos, project_id=experiment.project_id, record=link, cursor=event.id)
    await publish_record(repos=repos, project_id=experiment.project_id, record=activity, cursor=event.id)
    return artifact.id
