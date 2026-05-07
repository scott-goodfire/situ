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

    def execute_sync(
        self,
        *,
        ctx: RunContext[SituToolDeps],
        experiment_id: str,
        review: str,
        verdict: ExperimentReviewVerdict,
        recommended_next_step: ExperimentReviewNextStep,
        evidence_summary: str = "",
        concern_kinds: list[str] | None = None,
        reviewed_evaluation_ids: list[str] | None = None,
        reviewed_measurement_ids: list[int] | None = None,
        actor: str = "critic",
        payload: dict[str, Any] | None = None,
        **_kwargs: Any,
    ) -> AddExperimentReviewResult:
        """Record a Critic review on an experiment as a comment activity."""
        review_payload = {
            "activity_type": "critic_review",
            "verdict": verdict,
            "recommended_next_step": recommended_next_step,
            "evidence_summary": evidence_summary,
            "concern_kinds": concern_kinds or [],
            "reviewed_evaluation_ids": reviewed_evaluation_ids or [],
            "reviewed_measurement_ids": reviewed_measurement_ids or [],
            **(payload or {}),
        }
        activity = ctx.deps.get_repos().experiment_activities.add(
            experiment_id=experiment_id,
            created_in_session_id=ctx.deps.session_id,
            actor=actor,
            kind="comment",
            body=review,
            payload=review_payload,
        )
        event = ctx.deps.record_event(
            "experiment.review_added",
            review,
            payload={
                "activity_id": activity.id,
                "experiment_id": experiment_id,
                "verdict": verdict,
                "recommended_next_step": recommended_next_step,
            },
        )
        ctx.deps.publish_record(activity, event=event)
        return AddExperimentReviewResult(success=True, activity=activity.model_dump())
