from __future__ import annotations

from typing import Any, Literal

from pydantic_ai import RunContext

from ...common import BaseSituTool, SituToolDeps
from .models import AddExperimentReviewResult

ExperimentReviewVerdict = Literal[
    "usable",
    "concern",
    "invalid",
    "needs_reproduction",
    "human_review",
]

ExperimentReviewNextStep = Literal[
    "accept",
    "reproduce",
    "revise",
    "discard",
    "combine",
    "human_review",
]


class AddExperimentReviewTool(
    BaseSituTool[SituToolDeps, AddExperimentReviewResult]
):
    name = "add_experiment_review"
    result_type = AddExperimentReviewResult
    sequential = True

    async def execute(
        self,
        *,
        ctx: RunContext[SituToolDeps],
        experiment_id: str,
        review: str,
        verdict: ExperimentReviewVerdict,
        recommended_next_step: ExperimentReviewNextStep,
        review_task_id: str | None = None,
        evidence_summary: str = "",
        concern_kinds: list[str] | None = None,
        reviewed_evaluation_ids: list[str] | None = None,
        reviewed_measurement_ids: list[str] | None = None,
        actor: str = "critic",
        payload: dict[str, Any] | None = None,
        **_kwargs: Any,
    ) -> AddExperimentReviewResult:
        """Record a Critic review on an experiment as a comment activity."""
        repos = await ctx.deps.get_repos()
        experiment = await repos.experiments.get(experiment_id=experiment_id)
        if experiment is None:
            return self._failure(
                code="experiment_not_found",
                message=f"experiment not found: {experiment_id}",
            )

        if review_task_id is not None:
            review_task = await repos.tasks.get(task_id=review_task_id)
            if review_task is None:
                return self._failure(
                    code="review_task_not_found",
                    message=f"review_task_id not found: {review_task_id}",
                )
            if review_task.project_id != experiment.project_id:
                return self._failure(
                    code="review_task_project_mismatch",
                    message=(
                        f"review_task_id {review_task_id!r} belongs to a "
                        "different project than the experiment."
                    ),
                )
            if (
                review_task.work_type is not None
                and review_task.work_type.value != "review_experiment"
            ):
                return self._failure(
                    code="review_task_work_type_mismatch",
                    message=(
                        "add_experiment_review requires a task with "
                        f"work_type=review_experiment, got {review_task.work_type.value!r}."
                    ),
                )
            task_target_id = review_task.payload.get("experiment_id")
            if task_target_id is not None and task_target_id != experiment_id:
                return self._failure(
                    code="review_target_mismatch",
                    message=(
                        f"experiment_id {experiment_id!r} does not match the "
                        f"review task target {task_target_id!r}."
                    ),
                )

        evaluation_ids = reviewed_evaluation_ids or []
        measurement_ids = reviewed_measurement_ids or []
        invalid_evaluation_ids: list[str] = []
        for evaluation_id in evaluation_ids:
            evaluation = await repos.evaluations.get(evaluation_id=evaluation_id)
            if evaluation is None:
                invalid_evaluation_ids.append(evaluation_id)
                continue
            if evaluation.project_id != experiment.project_id:
                invalid_evaluation_ids.append(evaluation_id)
                continue
            if (
                evaluation.associated_experiment_id is not None
                and evaluation.associated_experiment_id != experiment_id
            ):
                invalid_evaluation_ids.append(evaluation_id)
        if invalid_evaluation_ids:
            return self._failure(
                code="invalid_review_evaluation_ids",
                message=(
                    "reviewed_evaluation_ids must exist in the project and "
                    "must not belong to a different experiment: "
                    f"{invalid_evaluation_ids}"
                ),
            )

        invalid_measurement_ids: list[str] = []
        for measurement_id in measurement_ids:
            measurement = await repos.measurements.get(measurement_id=measurement_id)
            if measurement is None:
                invalid_measurement_ids.append(measurement_id)
                continue
            evaluation = await repos.evaluations.get(evaluation_id=measurement.evaluation_id)
            if evaluation is None or evaluation.project_id != experiment.project_id:
                invalid_measurement_ids.append(measurement_id)
                continue
            if (
                evaluation.associated_experiment_id is not None
                and evaluation.associated_experiment_id != experiment_id
            ):
                invalid_measurement_ids.append(measurement_id)
        if invalid_measurement_ids:
            return self._failure(
                code="invalid_review_measurement_ids",
                message=(
                    "reviewed_measurement_ids must exist in the project and "
                    "must not belong to a different experiment: "
                    f"{invalid_measurement_ids}"
                ),
            )

        review_payload = {
            "activity_type": "critic_review",
            "work_type": "review_experiment",
            "verdict": verdict,
            "recommended_next_step": recommended_next_step,
            "evidence_summary": evidence_summary,
            "concern_kinds": concern_kinds or [],
            "reviewed_evaluation_ids": evaluation_ids,
            "reviewed_measurement_ids": measurement_ids,
        }
        if review_task_id is not None:
            review_payload["review_task_id"] = review_task_id
        review_payload.update(payload or {})
        activity = await repos.experiment_activities.add(
            experiment_id=experiment_id,
            created_in_session_id=ctx.deps.session_id,
            actor=actor,
            kind="comment",
            body=review,
            payload=review_payload,
        )
        event = await ctx.deps.record_event(
            event_type="experiment.review_added",
            message=review,
            payload={
                "activity_id": activity.id,
                "experiment_id": experiment_id,
                "verdict": verdict,
                "recommended_next_step": recommended_next_step,
                "review_task_id": review_task_id,
            },
        )
        await ctx.deps.publish_record(record=activity, event=event)
        return AddExperimentReviewResult(success=True, activity=activity.model_dump())
