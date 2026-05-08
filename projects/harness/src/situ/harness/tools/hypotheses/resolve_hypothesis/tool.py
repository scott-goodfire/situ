from __future__ import annotations

from typing import Any

from pydantic_ai import RunContext

from ....records import (
    HypothesisResolution,
    RecordStatus,
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

    async def execute(
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
        """Close a hypothesis with an explicit resolution activity.

        Resolutions: `supported` when recorded measurement evidence backs
        the claim, `rejected` when evidence contradicts it, `superseded`
        when a better-stated hypothesis replaces it (pass
        `superseded_by_hypothesis_id`), `inconclusive` when the empirical
        work was attempted but the evidence cannot decide. Pass
        `evidence_entity_ids` to link the analyses, experiments,
        evaluations, measurements, or artifacts that justify the
        resolution. The hypothesis is moved to `closed` and the
        resolution activity carries the durable rationale.

        Notes:
            `superseded_by_hypothesis_id` is required when resolution is
            `superseded` and rejected on the others. The replacement
            hypothesis must belong to the same project and cannot be the
            hypothesis being resolved. Each id in `evidence_entity_ids`
            must match a known record-id prefix (M, H, EX, EV, A, T, ART)
            and must belong to the current project.
        """
        repos = await ctx.deps.get_repos()
        hypothesis = await repos.hypotheses.get(hypothesis_id=hypothesis_id)
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

        if hypothesis.status == RecordStatus.DONE:
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
            superseding_hypothesis = await repos.hypotheses.get(
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
        invalid_evidence_ids = await _invalid_evidence_entity_ids(
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

        activity = await repos.hypothesis_activities.add(
            hypothesis_id=hypothesis.id,
            created_in_session_id=ctx.deps.session_id,
            actor=actor,
            kind="recorded",
            body=summary,
            payload={
                "record_type": "hypothesis_resolution",
                "resolution": checked_resolution.value,
                "evidence_entity_ids": evidence_ids,
                "superseded_by_hypothesis_id": superseded_by_hypothesis_id,
            },
        )
        resolved = await repos.hypotheses.update(
            hypothesis_id=hypothesis.id,
            status=RecordStatus.DONE,
        )
        if resolved is None:
            raise RuntimeError(f"hypothesis was not resolved: {hypothesis.id}")

        event = await ctx.deps.record_event(
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
        await ctx.deps.publish_record(record=activity, event=event)
        await ctx.deps.publish_record(record=resolved, event=event)
        return ResolveHypothesisResult(
            success=True,
            hypothesis=resolved.model_dump(),
            activity=activity.model_dump(),
        )


async def _invalid_evidence_entity_ids(
    *,
    repos: Repositories,
    project_id: str,
    evidence_entity_ids: list[str],
) -> list[str]:
    invalid_ids: list[str] = []
    for evidence_entity_id in evidence_entity_ids:
        exists = await _evidence_entity_exists(
            repos=repos,
            project_id=project_id,
            evidence_entity_id=evidence_entity_id,
        )
        if not exists:
            invalid_ids.append(evidence_entity_id)
    return invalid_ids


async def _evidence_entity_exists(
    *,
    repos: Repositories,
    project_id: str,
    evidence_entity_id: str,
) -> bool:
    if not isinstance(evidence_entity_id, str) or not evidence_entity_id.strip():
        return False
    record_id = evidence_entity_id.strip()
    if record_id.startswith("ART"):
        artifact = await repos.artifacts.get(artifact_id=record_id)
        return artifact is not None and artifact.project_id == project_id
    if record_id.startswith("EX"):
        experiment = await repos.experiments.get(experiment_id=record_id)
        return experiment is not None and experiment.project_id == project_id
    if record_id.startswith("EV"):
        evaluation = await repos.evaluations.get(evaluation_id=record_id)
        return evaluation is not None and evaluation.project_id == project_id
    if record_id.startswith("A"):
        analysis = await repos.analyses.get(analysis_id=record_id)
        return analysis is not None and analysis.project_id == project_id
    if record_id.startswith("B"):
        baseline = await repos.baselines.get(baseline_id=record_id)
        return baseline is not None and baseline.project_id == project_id
    if record_id.startswith("H"):
        hypothesis = await repos.hypotheses.get(hypothesis_id=record_id)
        return hypothesis is not None and hypothesis.project_id == project_id
    if record_id.startswith("T"):
        task = await repos.tasks.get(task_id=record_id)
        return task is not None and task.project_id == project_id
    if record_id.startswith("M"):
        measurement = await repos.measurements.get(measurement_id=record_id)
        if measurement is None:
            return False
        evaluation = await repos.evaluations.get(evaluation_id=measurement.evaluation_id)
        return evaluation is not None and evaluation.project_id == project_id
    return False
