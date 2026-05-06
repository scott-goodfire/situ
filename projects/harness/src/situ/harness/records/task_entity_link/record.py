from __future__ import annotations

from enum import StrEnum

from ..base import DbRecord


class TaskEntityKind(StrEnum):
    ANALYSIS = "analysis"
    HYPOTHESIS = "hypothesis"
    EXPERIMENT = "experiment"
    EVALUATION = "evaluation"
    ARTIFACT = "artifact"
    ANALYSIS_ACTIVITY = "analysis_activity"
    HYPOTHESIS_ACTIVITY = "hypothesis_activity"
    EXPERIMENT_ACTIVITY = "experiment_activity"
    EVALUATION_ACTIVITY = "evaluation_activity"
    TASK_ACTIVITY = "task_activity"
    EVENT = "event"


def parse_task_entity_kind(entity_kind: TaskEntityKind | str) -> TaskEntityKind:
    try:
        return TaskEntityKind(entity_kind)
    except ValueError as error:
        allowed = ", ".join(f"'{item.value}'" for item in TaskEntityKind)
        raise ValueError(
            f"invalid task entity kind: {entity_kind!r}. Use exactly one of {allowed}."
        ) from error


class TaskEntityLinkRecord(DbRecord):
    project_id: str
    task_id: str
    entity_kind: TaskEntityKind
    entity_id: str
    relationship: str
    created_at: str
