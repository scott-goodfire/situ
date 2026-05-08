from __future__ import annotations

from dataclasses import dataclass

from ...records import RecordStatus, TaskEntityKind, TaskRecord
from ...repositories import Repositories
from .events import publish_record, record_event

OWNED_EVIDENCE_LINK_RELATIONSHIPS = {"created", "produces"}
OPEN_EVIDENCE_STATUSES = {RecordStatus.ACTIVE, RecordStatus.IN_REVIEW}


@dataclass(frozen=True, slots=True)
class OpenEvidenceRecord:
    kind: TaskEntityKind
    record_id: str
    status: RecordStatus


async def list_open_evidence_records(
    *,
    repos: Repositories,
    project_id: str,
) -> list[OpenEvidenceRecord]:
    """Return active/in-review evidence records that prevent clean drain."""
    records: list[OpenEvidenceRecord] = []
    for baseline in await repos.baselines.list_for_project(project_id=project_id):
        if baseline.status in OPEN_EVIDENCE_STATUSES:
            records.append(
                OpenEvidenceRecord(
                    kind=TaskEntityKind.BASELINE,
                    record_id=baseline.id,
                    status=baseline.status,
                )
            )
    for experiment in await repos.experiments.list_for_project(project_id=project_id):
        if experiment.status in OPEN_EVIDENCE_STATUSES:
            records.append(
                OpenEvidenceRecord(
                    kind=TaskEntityKind.EXPERIMENT,
                    record_id=experiment.id,
                    status=experiment.status,
                )
            )
    for evaluation in await repos.evaluations.list_for_project(project_id=project_id):
        if evaluation.status in OPEN_EVIDENCE_STATUSES:
            records.append(
                OpenEvidenceRecord(
                    kind=TaskEntityKind.EVALUATION,
                    record_id=evaluation.id,
                    status=evaluation.status,
                )
            )
    return records


async def fail_owned_evidence_records_for_task(
    *,
    repos: Repositories,
    task: TaskRecord,
    session_id: str,
    reason: str,
) -> list[OpenEvidenceRecord]:
    """Fail active/in-review evidence records produced by a failed task."""
    targets: set[tuple[TaskEntityKind, str]] = set()
    for link in await repos.task_entity_links.list_for_task(task_id=task.id):
        if link.relationship not in OWNED_EVIDENCE_LINK_RELATIONSHIPS:
            continue
        if link.entity_kind in {
            TaskEntityKind.BASELINE,
            TaskEntityKind.EXPERIMENT,
            TaskEntityKind.EVALUATION,
        }:
            targets.add((link.entity_kind, link.entity_id))

    for kind, record_id in list(targets):
        if kind == TaskEntityKind.BASELINE:
            for evaluation in await repos.evaluations.list_for_baseline(
                baseline_id=record_id,
            ):
                targets.add((TaskEntityKind.EVALUATION, evaluation.id))
        if kind == TaskEntityKind.EXPERIMENT:
            for evaluation in await repos.evaluations.list_for_experiment(
                experiment_id=record_id,
            ):
                targets.add((TaskEntityKind.EVALUATION, evaluation.id))

    failed: list[OpenEvidenceRecord] = []
    for kind, record_id in sorted(targets, key=_evidence_sort_key):
        record = await _fail_evidence_record(
            repos=repos,
            kind=kind,
            record_id=record_id,
            session_id=session_id,
            reason=reason,
            source_task_id=task.id,
        )
        if record is not None:
            failed.append(record)
    return failed


async def _fail_evidence_record(
    *,
    repos: Repositories,
    kind: TaskEntityKind,
    record_id: str,
    session_id: str,
    reason: str,
    source_task_id: str,
) -> OpenEvidenceRecord | None:
    if kind == TaskEntityKind.BASELINE:
        baseline = await repos.baselines.get(baseline_id=record_id)
        if baseline is None or baseline.status not in OPEN_EVIDENCE_STATUSES:
            return None
        from_status = baseline.status.value
        updated = await repos.baselines.update(
            baseline_id=baseline.id,
            status=RecordStatus.FAILED,
        )
        if updated is None:
            return None
        status_activity = await repos.baseline_activities.add(
            baseline_id=baseline.id,
            created_in_session_id=session_id,
            actor="harness",
            kind="status_updated",
            body=f"Status changed from {from_status} to failed.",
            payload={"from_status": from_status, "to_status": "failed"},
        )
        comment_activity = await repos.baseline_activities.add(
            baseline_id=baseline.id,
            created_in_session_id=session_id,
            actor="harness",
            kind="comment",
            body=reason,
            payload={"source_task_id": source_task_id},
        )
        event = await record_event(
            repos=repos,
            event_type="baseline.failed",
            message=f"Failed baseline {baseline.id}",
            session_id=session_id,
            project_id=baseline.project_id,
            payload={
                "baseline_id": baseline.id,
                "source": "task_failure",
                "source_task_id": source_task_id,
                "reason": reason,
            },
        )
        await publish_record(
            repos=repos,
            project_id=baseline.project_id,
            record=updated,
            cursor=event.id,
        )
        await publish_record(
            repos=repos,
            project_id=baseline.project_id,
            record=status_activity,
            cursor=event.id,
        )
        await publish_record(
            repos=repos,
            project_id=baseline.project_id,
            record=comment_activity,
            cursor=event.id,
        )
        return OpenEvidenceRecord(
            kind=kind,
            record_id=baseline.id,
            status=updated.status,
        )

    if kind == TaskEntityKind.EXPERIMENT:
        experiment = await repos.experiments.get(experiment_id=record_id)
        if experiment is None or experiment.status not in OPEN_EVIDENCE_STATUSES:
            return None
        from_status = experiment.status.value
        updated = await repos.experiments.update(
            experiment_id=experiment.id,
            status=RecordStatus.FAILED,
        )
        if updated is None:
            return None
        status_activity = await repos.experiment_activities.add(
            experiment_id=experiment.id,
            created_in_session_id=session_id,
            actor="harness",
            kind="status_updated",
            body=f"Status changed from {from_status} to failed.",
            payload={"from_status": from_status, "to_status": "failed"},
        )
        comment_activity = await repos.experiment_activities.add(
            experiment_id=experiment.id,
            created_in_session_id=session_id,
            actor="harness",
            kind="comment",
            body=reason,
            payload={"source_task_id": source_task_id},
        )
        event = await record_event(
            repos=repos,
            event_type="experiment.failed",
            message=f"Failed experiment {experiment.id}",
            session_id=session_id,
            project_id=experiment.project_id,
            payload={
                "experiment_id": experiment.id,
                "source": "task_failure",
                "source_task_id": source_task_id,
                "reason": reason,
            },
        )
        await publish_record(
            repos=repos,
            project_id=experiment.project_id,
            record=updated,
            cursor=event.id,
        )
        await publish_record(
            repos=repos,
            project_id=experiment.project_id,
            record=status_activity,
            cursor=event.id,
        )
        await publish_record(
            repos=repos,
            project_id=experiment.project_id,
            record=comment_activity,
            cursor=event.id,
        )
        return OpenEvidenceRecord(
            kind=kind,
            record_id=experiment.id,
            status=updated.status,
        )

    if kind == TaskEntityKind.EVALUATION:
        evaluation = await repos.evaluations.get(evaluation_id=record_id)
        if evaluation is None or evaluation.status not in OPEN_EVIDENCE_STATUSES:
            return None
        from_status = evaluation.status.value
        updated = await repos.evaluations.update(
            evaluation_id=evaluation.id,
            status=RecordStatus.FAILED,
        )
        if updated is None:
            return None
        status_activity = await repos.evaluation_activities.add(
            evaluation_id=evaluation.id,
            created_in_session_id=session_id,
            actor="harness",
            kind="status_updated",
            body=f"Status changed from {from_status} to failed.",
            payload={"from_status": from_status, "to_status": "failed"},
        )
        comment_activity = await repos.evaluation_activities.add(
            evaluation_id=evaluation.id,
            created_in_session_id=session_id,
            actor="harness",
            kind="comment",
            body=reason,
            payload={"source_task_id": source_task_id},
        )
        event = await record_event(
            repos=repos,
            event_type="evaluation.failed",
            message=f"Failed evaluation {evaluation.id}",
            session_id=session_id,
            project_id=evaluation.project_id,
            payload={
                "evaluation_id": evaluation.id,
                "source": "task_failure",
                "source_task_id": source_task_id,
                "reason": reason,
            },
        )
        await publish_record(
            repos=repos,
            project_id=evaluation.project_id,
            record=updated,
            cursor=event.id,
        )
        await publish_record(
            repos=repos,
            project_id=evaluation.project_id,
            record=status_activity,
            cursor=event.id,
        )
        await publish_record(
            repos=repos,
            project_id=evaluation.project_id,
            record=comment_activity,
            cursor=event.id,
        )
        return OpenEvidenceRecord(
            kind=kind,
            record_id=evaluation.id,
            status=updated.status,
        )

    return None


def _evidence_sort_key(target: tuple[TaskEntityKind, str]) -> tuple[int, str]:
    order = {
        TaskEntityKind.BASELINE: 0,
        TaskEntityKind.EXPERIMENT: 1,
        TaskEntityKind.EVALUATION: 2,
    }
    return (order.get(target[0], 99), target[1])
