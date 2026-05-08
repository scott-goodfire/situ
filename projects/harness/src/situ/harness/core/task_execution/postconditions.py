from __future__ import annotations

from dataclasses import dataclass

from ...records import (
    ProjectStatus,
    RecordStatus,
    TaskEntityKind,
    TaskKind,
    TaskRecord,
    TaskSourceKind,
    TaskStatus,
)
from ...repositories import Repositories


@dataclass(frozen=True, slots=True)
class LinkedRecordStatus:
    kind: TaskEntityKind
    entity_id: str
    status: RecordStatus


@dataclass(frozen=True, slots=True)
class TaskStatusSnapshot:
    task_id: str
    task_kind: TaskKind
    created_in_session_id: str | None
    project_id: str
    project_status: ProjectStatus | None
    project_task_ids: frozenset[str]
    project_records: frozenset[LinkedRecordStatus]
    linked_records: tuple[LinkedRecordStatus, ...]


@dataclass(frozen=True, slots=True)
class TaskPostconditionResult:
    ok: bool
    reason: str


_MANAGER_OUTPUT_TASK_KINDS = {
    TaskKind.RESEARCH,
    TaskKind.HYPOTHESIZE,
    TaskKind.INTERPRET,
    TaskKind.BASELINE,
    TaskKind.EXPERIMENT,
}

_RESEARCHER_TASK_KINDS = {
    TaskKind.RESEARCH,
    TaskKind.HYPOTHESIZE,
    TaskKind.INTERPRET,
}

_RESEARCHER_RECORD_KINDS = {
    TaskEntityKind.ANALYSIS,
    TaskEntityKind.HYPOTHESIS,
}

_BASELINE_RECORD_KINDS = {
    TaskEntityKind.BASELINE,
    TaskEntityKind.EVALUATION,
}

_EXPERIMENT_RECORD_KINDS = {
    TaskEntityKind.EXPERIMENT,
    TaskEntityKind.EVALUATION,
}

_SCIENTIST_PROGRESS_STATUSES = {
    RecordStatus.IN_REVIEW,
    RecordStatus.DONE,
    RecordStatus.CANCELED,
    RecordStatus.FAILED,
}

_EXPLICIT_TASK_FAILURE_STATUSES = {
    TaskStatus.CANCELED,
    TaskStatus.FAILED,
}


async def capture_task_status_snapshot(
    *,
    repos: Repositories,
    task: TaskRecord,
) -> TaskStatusSnapshot:
    current = await repos.tasks.get(task_id=task.id) or task
    project = await repos.projects.get(project_id=current.project_id)
    project_tasks = await repos.tasks.list_for_project(project_id=current.project_id)
    return TaskStatusSnapshot(
        task_id=current.id,
        task_kind=current.kind,
        created_in_session_id=current.created_in_session_id,
        project_id=current.project_id,
        project_status=project.status if project is not None else None,
        project_task_ids=frozenset(row.id for row in project_tasks),
        project_records=frozenset(
            await _project_record_statuses(
                repos=repos,
                project_id=current.project_id,
            )
        ),
        linked_records=await _linked_record_statuses(
            repos=repos,
            task_id=current.id,
        ),
    )


async def validate_task_status_progress(
    *,
    repos: Repositories,
    snapshot: TaskStatusSnapshot,
) -> TaskPostconditionResult:
    task = await repos.tasks.get(task_id=snapshot.task_id)
    if task is None:
        return TaskPostconditionResult(
            ok=False,
            reason=f"Task {snapshot.task_id} no longer exists.",
        )
    if task.status in _EXPLICIT_TASK_FAILURE_STATUSES:
        return TaskPostconditionResult(
            ok=True,
            reason=f"Task explicitly moved to {task.status.value}.",
        )

    if snapshot.task_kind == TaskKind.PLAN:
        return await _validate_manager_progress(
            repos=repos,
            snapshot=snapshot,
        )
    if snapshot.task_kind in _RESEARCHER_TASK_KINDS:
        return await _validate_researcher_progress(
            repos=repos,
            snapshot=snapshot,
        )
    if snapshot.task_kind == TaskKind.BASELINE:
        return await _validate_scientist_progress(
            repos=repos,
            snapshot=snapshot,
            record_kinds=_BASELINE_RECORD_KINDS,
            noun="baseline",
        )
    if snapshot.task_kind == TaskKind.EXPERIMENT:
        return await _validate_scientist_progress(
            repos=repos,
            snapshot=snapshot,
            record_kinds=_EXPERIMENT_RECORD_KINDS,
            noun="experiment",
        )
    return TaskPostconditionResult(
        ok=False,
        reason=f"No status-progress postcondition is defined for {snapshot.task_kind.value} tasks.",
    )


async def _validate_manager_progress(
    *,
    repos: Repositories,
    snapshot: TaskStatusSnapshot,
) -> TaskPostconditionResult:
    project = await repos.projects.get(project_id=snapshot.project_id)
    if (
        project is not None
        and project.status == ProjectStatus.CLOSED
        and snapshot.project_status != ProjectStatus.CLOSED
    ):
        return TaskPostconditionResult(
            ok=True,
            reason="Project was closed.",
        )

    project_tasks = await repos.tasks.list_for_project(project_id=snapshot.project_id)
    new_output_tasks = [
        task
        for task in project_tasks
        if task.id not in snapshot.project_task_ids
        and task.kind in _MANAGER_OUTPUT_TASK_KINDS
        and task.source_kind == TaskSourceKind.MANAGER
        and task.created_in_session_id == snapshot.created_in_session_id
    ]
    if new_output_tasks:
        return TaskPostconditionResult(
            ok=True,
            reason="Manager created producer work.",
        )

    existing_actionable_output_tasks = [
        task
        for task in project_tasks
        if task.id != snapshot.task_id
        and task.kind in _MANAGER_OUTPUT_TASK_KINDS
        and task.created_in_session_id == snapshot.created_in_session_id
        and task.status in {TaskStatus.BACKLOG, TaskStatus.IN_PROGRESS}
    ]
    if existing_actionable_output_tasks:
        return TaskPostconditionResult(
            ok=True,
            reason="Manager confirmed existing actionable work.",
        )

    return TaskPostconditionResult(
        ok=False,
        reason="Manager plan made no status progress: no Researcher or Scientist task was created and the project was not closed.",
    )


async def _validate_researcher_progress(
    *,
    repos: Repositories,
    snapshot: TaskStatusSnapshot,
) -> TaskPostconditionResult:
    after = await _linked_record_statuses(
        repos=repos,
        task_id=snapshot.task_id,
    )
    if _has_linked_status_progress(
        project_before=snapshot.project_records,
        after=after,
        record_kinds=_RESEARCHER_RECORD_KINDS,
        allowed_statuses=None,
    ):
        return TaskPostconditionResult(
            ok=True,
            reason="Researcher linked or moved an analysis or hypothesis.",
        )
    return TaskPostconditionResult(
        ok=False,
        reason="Researcher task made no status progress: no linked analysis or hypothesis was created or moved status.",
    )


async def _validate_scientist_progress(
    *,
    repos: Repositories,
    snapshot: TaskStatusSnapshot,
    record_kinds: set[TaskEntityKind],
    noun: str,
) -> TaskPostconditionResult:
    after = await _linked_record_statuses(
        repos=repos,
        task_id=snapshot.task_id,
    )
    if _has_linked_status_progress(
        project_before=snapshot.project_records,
        after=after,
        record_kinds=record_kinds,
        allowed_statuses=_SCIENTIST_PROGRESS_STATUSES,
    ):
        return TaskPostconditionResult(
            ok=True,
            reason=f"Scientist moved linked {noun} evidence to review or terminal status.",
        )
    allowed = ", ".join(
        f"`{status.value}`" for status in sorted(_SCIENTIST_PROGRESS_STATUSES)
    )
    return TaskPostconditionResult(
        ok=False,
        reason=(
            f"Scientist {noun} task made no status progress: no linked "
            f"{noun} or evaluation reached {allowed}."
        ),
    )


def _has_linked_status_progress(
    *,
    project_before: frozenset[LinkedRecordStatus],
    after: tuple[LinkedRecordStatus, ...],
    record_kinds: set[TaskEntityKind],
    allowed_statuses: set[RecordStatus] | None,
) -> bool:
    before_statuses = {
        _linked_record_key(record): record.status
        for record in project_before
        if record.kind in record_kinds
    }
    for record in after:
        if record.kind not in record_kinds:
            continue
        if allowed_statuses is not None and record.status not in allowed_statuses:
            continue
        prior_status = before_statuses.get(_linked_record_key(record))
        if prior_status is None or prior_status != record.status:
            return True
    return False


async def _project_record_statuses(
    *,
    repos: Repositories,
    project_id: str,
) -> tuple[LinkedRecordStatus, ...]:
    records: list[LinkedRecordStatus] = []
    records.extend(
        LinkedRecordStatus(
            kind=TaskEntityKind.ANALYSIS,
            entity_id=record.id,
            status=record.status,
        )
        for record in await repos.analyses.list_for_project(project_id=project_id)
    )
    records.extend(
        LinkedRecordStatus(
            kind=TaskEntityKind.HYPOTHESIS,
            entity_id=record.id,
            status=record.status,
        )
        for record in await repos.hypotheses.list_for_project(project_id=project_id)
    )
    records.extend(
        LinkedRecordStatus(
            kind=TaskEntityKind.BASELINE,
            entity_id=record.id,
            status=record.status,
        )
        for record in await repos.baselines.list_for_project(project_id=project_id)
    )
    records.extend(
        LinkedRecordStatus(
            kind=TaskEntityKind.EXPERIMENT,
            entity_id=record.id,
            status=record.status,
        )
        for record in await repos.experiments.list_for_project(project_id=project_id)
    )
    records.extend(
        LinkedRecordStatus(
            kind=TaskEntityKind.EVALUATION,
            entity_id=record.id,
            status=record.status,
        )
        for record in await repos.evaluations.list_for_project(project_id=project_id)
    )
    return tuple(records)


async def _linked_record_statuses(
    *,
    repos: Repositories,
    task_id: str,
) -> tuple[LinkedRecordStatus, ...]:
    records: list[LinkedRecordStatus] = []
    for link in await repos.task_entity_links.list_for_task(task_id=task_id):
        status = await _record_status(
            repos=repos,
            kind=link.entity_kind,
            entity_id=link.entity_id,
        )
        if status is None:
            continue
        records.append(
            LinkedRecordStatus(
                kind=link.entity_kind,
                entity_id=link.entity_id,
                status=status,
            )
        )
    return tuple(records)


async def _record_status(
    *,
    repos: Repositories,
    kind: TaskEntityKind,
    entity_id: str,
) -> RecordStatus | None:
    if kind == TaskEntityKind.ANALYSIS:
        record = await repos.analyses.get(analysis_id=entity_id)
    elif kind == TaskEntityKind.HYPOTHESIS:
        record = await repos.hypotheses.get(hypothesis_id=entity_id)
    elif kind == TaskEntityKind.BASELINE:
        record = await repos.baselines.get(baseline_id=entity_id)
    elif kind == TaskEntityKind.EXPERIMENT:
        record = await repos.experiments.get(experiment_id=entity_id)
    elif kind == TaskEntityKind.EVALUATION:
        record = await repos.evaluations.get(evaluation_id=entity_id)
    else:
        return None
    return record.status if record is not None else None


def _linked_record_key(record: LinkedRecordStatus) -> tuple[TaskEntityKind, str]:
    return (record.kind, record.entity_id)
