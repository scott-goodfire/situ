from __future__ import annotations

from collections import Counter
from datetime import UTC, datetime
from typing import Any

from ...records import (
    AnalysisRecord,
    ArtifactRecord,
    BaselineRecord,
    EventRecord,
    EvaluationRecord,
    ExperimentRecord,
    HypothesisRecord,
    MeasurementRecord,
    ProjectRecord,
    RecordStatus,
    SessionRecord,
    TaskDependencyRecord,
    TaskRecord,
    TaskStatus,
)
from .schemas import BoardSummarySchema

TERMINAL_TASK_STATUSES = {
    TaskStatus.DONE.value,
    TaskStatus.CANCELED.value,
    TaskStatus.FAILED.value,
}


def build_board_summary(
    *,
    project: ProjectRecord | None,
    session: SessionRecord | None,
    tasks: list[TaskRecord],
    task_dependencies: list[TaskDependencyRecord],
    analyses: list[AnalysisRecord],
    hypotheses: list[HypothesisRecord],
    baselines: list[BaselineRecord],
    experiments: list[ExperimentRecord],
    evaluations: list[EvaluationRecord],
    measurements: list[MeasurementRecord],
    artifacts: list[ArtifactRecord],
    events: list[EventRecord],
) -> BoardSummarySchema:
    now = datetime.now(tz=UTC)
    return BoardSummarySchema(
        generated_at=now.isoformat(),
        session_elapsed=_elapsed_since(
            timestamp=session.created_at if session is not None else None,
            now=now,
        ),
        project_elapsed=_elapsed_since(
            timestamp=project.created_at if project is not None else None,
            now=now,
        ),
        last_event_at=events[-1].created_at if events else None,
        time_since_last_event=_elapsed_since(
            timestamp=events[-1].created_at if events else None,
            now=now,
        ),
        task_counts=_task_counts(
            tasks=tasks,
            task_dependencies=task_dependencies,
            now=now,
        ),
        record_counts={
            "analyses": _status_counts(records=analyses),
            "hypotheses": _status_counts(records=hypotheses),
            "baselines": _status_counts(records=baselines),
            "experiments": _status_counts(records=experiments),
            "evaluations": _status_counts(records=evaluations),
            "measurements": {"total": len(measurements)},
            "artifacts": {"total": len(artifacts)},
            "events": {"total": len(events)},
        },
        review_counts=_review_counts(
            analyses=analyses,
            hypotheses=hypotheses,
            baselines=baselines,
            experiments=experiments,
            evaluations=evaluations,
        ),
    )


def _task_counts(
    *,
    tasks: list[TaskRecord],
    task_dependencies: list[TaskDependencyRecord],
    now: datetime,
) -> dict[str, Any]:
    completed_task_ids = {
        task.id for task in tasks if str(task.status) in TERMINAL_TASK_STATUSES
    }
    blocked_task_ids = {
        dependency.task_id
        for dependency in task_dependencies
        if dependency.blocked_by_task_id not in completed_task_ids
    }
    runnable_tasks = [
        task
        for task in tasks
        if str(task.status) == TaskStatus.BACKLOG.value
        and task.id not in blocked_task_ids
        and _is_available(task=task, now=now)
    ]
    open_tasks = [
        task for task in tasks if str(task.status) not in TERMINAL_TASK_STATUSES
    ]
    return {
        "total": len(tasks),
        "open": len(open_tasks),
        "runnable": len(runnable_tasks),
        "blocked": len(blocked_task_ids),
        "by_status": _count_values(values=[str(task.status) for task in tasks]),
        "by_kind": _count_values(values=[str(task.kind) for task in tasks]),
    }


def _status_counts(
    *,
    records: list[Any],
) -> dict[str, Any]:
    return {
        "total": len(records),
        "by_status": _count_values(values=[str(record.status) for record in records]),
    }


def _review_counts(
    *,
    analyses: list[AnalysisRecord],
    hypotheses: list[HypothesisRecord],
    baselines: list[BaselineRecord],
    experiments: list[ExperimentRecord],
    evaluations: list[EvaluationRecord],
) -> dict[str, int]:
    records = [*analyses, *hypotheses, *baselines, *experiments, *evaluations]
    triage = sum(
        1 for record in records if str(record.status) == RecordStatus.TRIAGE.value
    )
    in_review = sum(
        1 for record in records if str(record.status) == RecordStatus.IN_REVIEW.value
    )
    return {
        "triage_records": triage,
        "in_review_records": in_review,
        "pending_critic_records": triage + in_review,
    }


def _count_values(
    *,
    values: list[str],
) -> dict[str, int]:
    return dict(sorted(Counter(values).items()))


def _is_available(
    *,
    task: TaskRecord,
    now: datetime,
) -> bool:
    available_at = _parse_timestamp(timestamp=task.available_at)
    return available_at is None or available_at <= now


def _elapsed_since(
    *,
    timestamp: str | None,
    now: datetime,
) -> str | None:
    parsed = _parse_timestamp(timestamp=timestamp)
    if parsed is None:
        return None
    elapsed_seconds = max(0, int((now - parsed).total_seconds()))
    return _human_duration(seconds=elapsed_seconds)


def _parse_timestamp(
    *,
    timestamp: str | None,
) -> datetime | None:
    if timestamp is None:
        return None
    try:
        parsed = datetime.fromisoformat(timestamp.replace("Z", "+00:00"))
    except ValueError:
        return None
    if parsed.tzinfo is None:
        parsed = parsed.replace(tzinfo=UTC)
    return parsed.astimezone(tz=UTC)


def _human_duration(
    *,
    seconds: int,
) -> str:
    days, remainder = divmod(seconds, 86_400)
    hours, remainder = divmod(remainder, 3_600)
    minutes, seconds = divmod(remainder, 60)
    parts: list[str] = []
    for value, noun in (
        (days, "day"),
        (hours, "hour"),
        (minutes, "minute"),
        (seconds, "second"),
    ):
        if value or parts or noun == "second":
            suffix = "" if value == 1 else "s"
            parts.append(f"{value} {noun}{suffix}")
    return ", ".join(parts)
