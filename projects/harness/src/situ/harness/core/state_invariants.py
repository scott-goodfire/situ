from __future__ import annotations

from dataclasses import dataclass, field
from typing import Any

from ..records import (
    ComputeTargetStatus,
    RecordStatus,
    TaskEntityKind,
    TaskStatus,
    WorkItemPurpose,
)
from ..repositories import Repositories
from .critic_review import list_pending_critic_records


@dataclass(frozen=True, slots=True)
class StateInvariantViolation:
    code: str
    message: str
    record_kind: str | None = None
    record_id: str | None = None
    details: dict[str, Any] = field(default_factory=dict)


async def check_state_invariants(repos: Repositories) -> list[StateInvariantViolation]:
    """Return durable-state contradictions that should not survive recovery."""
    violations: list[StateInvariantViolation] = []
    violations.extend(await _active_evidence_terminal_task_violations(repos))
    violations.extend(await _claimed_compute_target_violations(repos))
    violations.extend(await _missing_critic_work_item_violations(repos))
    return violations


async def _active_evidence_terminal_task_violations(
    repos: Repositories,
) -> list[StateInvariantViolation]:
    terminal = {TaskStatus.DONE, TaskStatus.CANCELED, TaskStatus.FAILED}
    violations: list[StateInvariantViolation] = []
    evidence_records = [
        (TaskEntityKind.BASELINE, record.id, record.status)
        for record in await repos.baselines.list_all()
        if record.status == RecordStatus.ACTIVE
    ]
    evidence_records.extend(
        (TaskEntityKind.EXPERIMENT, record.id, record.status)
        for record in await repos.experiments.list_all()
        if record.status == RecordStatus.ACTIVE
    )
    evidence_records.extend(
        (TaskEntityKind.EVALUATION, record.id, record.status)
        for record in await repos.evaluations.list_all()
        if record.status == RecordStatus.ACTIVE
    )
    for kind, record_id, status in evidence_records:
        links = await repos.task_entity_links.list_for_entity(
            entity_kind=kind,
            entity_id=record_id,
        )
        linked_tasks = []
        for link in links:
            task = await repos.tasks.get(task_id=link.task_id)
            if task is not None:
                linked_tasks.append(task)
        if not linked_tasks:
            continue
        if any(task.status not in terminal for task in linked_tasks):
            continue
        violations.append(
            StateInvariantViolation(
                code="active_evidence_without_live_task",
                message=(
                    f"Active {kind.value} {record_id} is linked only to "
                    "terminal tasks."
                ),
                record_kind=kind.value,
                record_id=record_id,
                details={
                    "task_ids": [task.id for task in linked_tasks],
                    "task_statuses": [task.status.value for task in linked_tasks],
                    "status": status.value,
                },
            )
        )
    return violations


async def _claimed_compute_target_violations(
    repos: Repositories,
) -> list[StateInvariantViolation]:
    terminal = {TaskStatus.DONE, TaskStatus.CANCELED, TaskStatus.FAILED}
    violations: list[StateInvariantViolation] = []
    lease_statuses = {ComputeTargetStatus.CLAIMED, ComputeTargetStatus.DRAINING}
    for target in await repos.compute_targets.list_all():
        if target.status not in lease_statuses or target.claimed_by_task_id is None:
            continue
        task_id = target.claimed_by_task_id
        task = await repos.tasks.get(task_id=task_id) if task_id is not None else None
        if task is None:
            violations.append(
                StateInvariantViolation(
                    code="claimed_compute_target_without_task",
                    message=f"Claimed compute target {target.id} has no live owner task.",
                    record_kind="compute_target",
                    record_id=target.id,
                    details={"claimed_by_task_id": task_id},
                )
            )
            continue
        if task.status in terminal or task.workflow_id is None:
            violations.append(
                StateInvariantViolation(
                    code="claimed_compute_target_invalid_owner",
                    message=(
                        f"Claimed compute target {target.id} is owned by "
                        f"{task.id}, which cannot hold a lease."
                    ),
                    record_kind="compute_target",
                    record_id=target.id,
                    details={
                        "claimed_by_task_id": task.id,
                        "task_status": task.status.value,
                        "workflow_id": task.workflow_id,
                    },
                )
            )
    return violations


async def _missing_critic_work_item_violations(
    repos: Repositories,
) -> list[StateInvariantViolation]:
    violations: list[StateInvariantViolation] = []
    project_ids = {project.id for project in await repos.projects.list_all()}
    for project_id in sorted(project_ids):
        for record in await list_pending_critic_records(
            repos=repos,
            project_id=project_id,
        ):
            work_item = await repos.work_items.get_open_for_target(
                project_id=project_id,
                purpose=WorkItemPurpose.CRITIC_REVIEW,
                target_kind=record.kind,
                target_id=record.record_id,
            )
            if work_item is not None:
                continue
            violations.append(
                StateInvariantViolation(
                    code="pending_critic_record_without_work_item",
                    message=(
                        f"Pending Critic record {record.kind}:{record.record_id} "
                        "has no open review work item."
                    ),
                    record_kind=record.kind,
                    record_id=record.record_id,
                    details={
                        "project_id": project_id,
                        "status": record.status.value,
                    },
                )
            )
    return violations
