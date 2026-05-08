from __future__ import annotations

from ...records import TaskEntityKind
from ...repositories import Repositories


async def task_entity_target_exists(
    *,
    repos: Repositories,
    project_id: str,
    entity_kind: TaskEntityKind,
    entity_id: str,
) -> bool:
    """Return whether a task-entity link target exists in the same project."""
    if entity_kind == TaskEntityKind.ANALYSIS:
        record = await repos.analyses.get(analysis_id=entity_id)
        return record is not None and record.project_id == project_id
    if entity_kind == TaskEntityKind.BASELINE:
        record = await repos.baselines.get(baseline_id=entity_id)
        return record is not None and record.project_id == project_id
    if entity_kind == TaskEntityKind.HYPOTHESIS:
        record = await repos.hypotheses.get(hypothesis_id=entity_id)
        return record is not None and record.project_id == project_id
    if entity_kind == TaskEntityKind.EXPERIMENT:
        record = await repos.experiments.get(experiment_id=entity_id)
        return record is not None and record.project_id == project_id
    if entity_kind == TaskEntityKind.EVALUATION:
        record = await repos.evaluations.get(evaluation_id=entity_id)
        return record is not None and record.project_id == project_id
    if entity_kind == TaskEntityKind.MEASUREMENT:
        record = await repos.measurements.get(measurement_id=entity_id)
        if record is None:
            return False
        evaluation = await repos.evaluations.get(evaluation_id=record.evaluation_id)
        return evaluation is not None and evaluation.project_id == project_id
    if entity_kind == TaskEntityKind.ARTIFACT:
        record = await repos.artifacts.get(artifact_id=entity_id)
        return record is not None and record.project_id == project_id
    if entity_kind == TaskEntityKind.ANALYSIS_ACTIVITY:
        activity = await repos.analysis_activities.get(activity_id=int(entity_id))
        if activity is None:
            return False
        analysis = await repos.analyses.get(analysis_id=activity.analysis_id)
        return analysis is not None and analysis.project_id == project_id
    if entity_kind == TaskEntityKind.HYPOTHESIS_ACTIVITY:
        activity = await repos.hypothesis_activities.get(activity_id=int(entity_id))
        if activity is None:
            return False
        hypothesis = await repos.hypotheses.get(hypothesis_id=activity.hypothesis_id)
        return hypothesis is not None and hypothesis.project_id == project_id
    if entity_kind == TaskEntityKind.EXPERIMENT_ACTIVITY:
        activity = await repos.experiment_activities.get(activity_id=int(entity_id))
        if activity is None:
            return False
        experiment = await repos.experiments.get(experiment_id=activity.experiment_id)
        return experiment is not None and experiment.project_id == project_id
    if entity_kind == TaskEntityKind.EVALUATION_ACTIVITY:
        activity = await repos.evaluation_activities.get(activity_id=int(entity_id))
        if activity is None:
            return False
        evaluation = await repos.evaluations.get(evaluation_id=activity.evaluation_id)
        return evaluation is not None and evaluation.project_id == project_id
    if entity_kind == TaskEntityKind.TASK_ACTIVITY:
        activity = await repos.task_activities.get(activity_id=int(entity_id))
        return activity is not None and activity.project_id == project_id
    if entity_kind == TaskEntityKind.EVENT:
        event = await repos.events.get(event_id=int(entity_id))
        if event is None:
            return False
        if event.associated_project_id == project_id:
            return True
        if event.associated_session_id is None:
            return False
        session = await repos.sessions.get(session_id=event.associated_session_id)
        return session is not None and session.project_id == project_id
    return False
