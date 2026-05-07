from __future__ import annotations

from typing import Any

from pydantic_ai import RunContext

from ....records import (
    HypothesisResolution,
    WorkStatus,
    parse_hypothesis_resolution,
)
from ....repositories import Repositories
from ...common import BaseSituTool, SituToolDeps
from .models import ResolveHypothesisResult


class ResolveHypothesisTool(
    BaseSituTool[SituToolDeps, ResolveHypothesisResult]
):
    name = "resolve_hypothesis"
    result_type = ResolveHypothesisResult
    sequential = True

    def execute_sync(
        self,
        *,
        ctx: RunContext[SituToolDeps],
        hypothesis_id: str,
        resolution: HypothesisResolution,
        summary: str,
        evidence_entity_ids: list[str] | None = None,
        superseded_by_hypothesis_id: str | None = None,
        actor: str = "agent",
        **_kwargs: Any,
    ) -> ResolveHypothesisResult:
        """Close a hypothesis with an explicit resolution activity."""
        repos = ctx.deps.get_repos()
        hypothesis = repos.hypotheses.get(hypothesis_id=hypothesis_id)
        if hypothesis is None:
            return self._failure(
                code="hypothesis_not_found",
                message=f"hypothesis not found: {hypothesis_id}",
            )

        try:
            checked_resolution = parse_hypothesis_resolution(resolution)
        except ValueError as error:
            return self._failure(
                code="invalid_hypothesis_resolution",
                message=str(error),
            )

        if hypothesis.status == WorkStatus.CLOSED:
            return self._failure(
                code="hypothesis_already_closed",
                message=(
                    f"hypothesis {hypothesis.id} is already closed. Reopen it "
                    "before recording a different resolution."
                ),
            )

        if checked_resolution == HypothesisResolution.SUPERSEDED:
            if superseded_by_hypothesis_id is None:
                return self._failure(
                    code="missing_superseded_by_hypothesis",
                    message=(
                        "superseded_by_hypothesis_id is required when "
                        "resolution is 'superseded'."
                    ),
                )
            superseding_hypothesis = repos.hypotheses.get(
                hypothesis_id=superseded_by_hypothesis_id,
            )
            if (
                superseding_hypothesis is None
                or superseding_hypothesis.project_id != hypothesis.project_id
                or superseding_hypothesis.id == hypothesis.id
            ):
                return self._failure(
                    code="invalid_superseded_by_hypothesis",
                    message=(
                        "superseded_by_hypothesis_id must refer to a different "
                        f"hypothesis in project {hypothesis.project_id}: "
                        f"{superseded_by_hypothesis_id}"
                    ),
                )
        elif superseded_by_hypothesis_id is not None:
            return self._failure(
                code="unexpected_superseded_by_hypothesis",
                message=(
                    "superseded_by_hypothesis_id is only valid when resolution "
                    "is 'superseded'."
                ),
            )

        evidence_ids = evidence_entity_ids or []
        invalid_evidence_ids = _invalid_evidence_entity_ids(
            repos=repos,
            project_id=hypothesis.project_id,
            evidence_entity_ids=evidence_ids,
        )
        if invalid_evidence_ids:
            return self._failure(
                code="invalid_evidence_entity",
                message=(
                    "evidence_entity_ids must refer to records in project "
                    f"{hypothesis.project_id}: {invalid_evidence_ids}"
                ),
            )

        activity = repos.hypothesis_activities.add(
            hypothesis_id=hypothesis.id,
            created_in_session_id=ctx.deps.session_id,
            actor=actor,
            kind="comment",
            body=summary,
            payload={
                "activity_type": "hypothesis_resolution",
                "resolution": checked_resolution.value,
                "evidence_entity_ids": evidence_ids,
                "superseded_by_hypothesis_id": superseded_by_hypothesis_id,
            },
        )
        resolved = repos.hypotheses.update(
            hypothesis_id=hypothesis.id,
            status=WorkStatus.CLOSED,
        )
        if resolved is None:
            raise RuntimeError(f"hypothesis was not resolved: {hypothesis.id}")

        event = ctx.deps.record_event(
            event_type="hypothesis.resolved",
            message=(
                f"Resolved hypothesis {hypothesis.id} as "
                f"{checked_resolution.value}"
            ),
            payload={
                "hypothesis_id": hypothesis.id,
                "activity_id": activity.id,
                "resolution": checked_resolution.value,
                "evidence_entity_ids": evidence_ids,
                "superseded_by_hypothesis_id": superseded_by_hypothesis_id,
            },
        )
        ctx.deps.publish_record(record=activity, event=event)
        ctx.deps.publish_record(record=resolved, event=event)
        return ResolveHypothesisResult(
            success=True,
            hypothesis=resolved.model_dump(),
            activity=activity.model_dump(),
        )


def _invalid_evidence_entity_ids(
    *,
    repos: Repositories,
    project_id: str,
    evidence_entity_ids: list[str],
) -> list[str]:
    return [
        evidence_entity_id
        for evidence_entity_id in evidence_entity_ids
        if not _evidence_entity_exists(
            repos=repos,
            project_id=project_id,
            evidence_entity_id=evidence_entity_id,
        )
    ]


def _evidence_entity_exists(
    *,
    repos: Repositories,
    project_id: str,
    evidence_entity_id: str,
) -> bool:
    if not isinstance(evidence_entity_id, str) or not evidence_entity_id.strip():
        return False
    record_id = evidence_entity_id.strip()
    if record_id.startswith("ART"):
        artifact = repos.artifacts.get(artifact_id=record_id)
        return artifact is not None and artifact.project_id == project_id
    if record_id.startswith("EX"):
        experiment = repos.experiments.get(experiment_id=record_id)
        return experiment is not None and experiment.project_id == project_id
    if record_id.startswith("EV"):
        evaluation = repos.evaluations.get(evaluation_id=record_id)
        return evaluation is not None and evaluation.project_id == project_id
    if record_id.startswith("A"):
        analysis = repos.analyses.get(analysis_id=record_id)
        return analysis is not None and analysis.project_id == project_id
    if record_id.startswith("B"):
        baseline = repos.baselines.get(baseline_id=record_id)
        return baseline is not None and baseline.project_id == project_id
    if record_id.startswith("H"):
        hypothesis = repos.hypotheses.get(hypothesis_id=record_id)
        return hypothesis is not None and hypothesis.project_id == project_id
    if record_id.startswith("T"):
        task = repos.tasks.get(task_id=record_id)
        return task is not None and task.project_id == project_id
    measurement_id = _measurement_id_from_evidence_id(record_id)
    if measurement_id is not None:
        measurement = repos.measurements.get(measurement_id=measurement_id)
        if measurement is None:
            return False
        evaluation = repos.evaluations.get(evaluation_id=measurement.evaluation_id)
        return evaluation is not None and evaluation.project_id == project_id
    return False


def _measurement_id_from_evidence_id(evidence_entity_id: str) -> int | None:
    if evidence_entity_id.isdigit():
        return int(evidence_entity_id)
    if evidence_entity_id.startswith("M") and evidence_entity_id[1:].isdigit():
        return int(evidence_entity_id[1:])
    return None
