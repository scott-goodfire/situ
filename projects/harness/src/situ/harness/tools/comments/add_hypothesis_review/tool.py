from __future__ import annotations

from typing import Any, Literal

from pydantic_ai import RunContext

from ...common import BaseSituTool, SituToolDeps
from .models import AddHypothesisReviewResult

HypothesisReviewVerdict = Literal[
    "usable",
    "concern",
    "invalid",
    "needs_more_evidence",
    "human_review",
]

HypothesisReviewNextStep = Literal[
    "test",
    "revise",
    "discard",
    "human_review",
]


class AddHypothesisReviewTool(
    BaseSituTool[SituToolDeps, AddHypothesisReviewResult]
):
    name = "add_hypothesis_review"
    result_type = AddHypothesisReviewResult
    sequential = True

    async def execute(
        self,
        *,
        ctx: RunContext[SituToolDeps],
        hypothesis_id: str,
        review: str,
        verdict: HypothesisReviewVerdict,
        recommended_next_step: HypothesisReviewNextStep,
        review_task_id: str | None = None,
        evidence_summary: str = "",
        concern_kinds: list[str] | None = None,
        actor: str = "critic",
        payload: dict[str, Any] | None = None,
        **_kwargs: Any,
    ) -> AddHypothesisReviewResult:
        """Record a Critic review on a hypothesis as a comment activity."""
        repos = await ctx.deps.get_repos()
        hypothesis = await repos.hypotheses.get(hypothesis_id=hypothesis_id)
        if hypothesis is None:
            return self._failure(
                code="hypothesis_not_found",
                message=f"hypothesis not found: {hypothesis_id}",
            )

        if review_task_id is not None:
            review_task = await repos.tasks.get(task_id=review_task_id)
            if review_task is None:
                return self._failure(
                    code="review_task_not_found",
                    message=f"review_task_id not found: {review_task_id}",
                )
            if (
                review_task.work_type is not None
                and review_task.work_type.value != "review_hypothesis"
            ):
                return self._failure(
                    code="review_task_work_type_mismatch",
                    message=(
                        "add_hypothesis_review requires a task with "
                        f"work_type=review_hypothesis, got {review_task.work_type.value!r}."
                    ),
                )
            task_target_id = review_task.payload.get("hypothesis_id")
            if task_target_id is not None and task_target_id != hypothesis_id:
                return self._failure(
                    code="review_target_mismatch",
                    message=(
                        f"hypothesis_id {hypothesis_id!r} does not match the "
                        f"review task target {task_target_id!r}."
                    ),
                )

        review_payload = {
            "activity_type": "critic_review",
            "work_type": "review_hypothesis",
            "verdict": verdict,
            "recommended_next_step": recommended_next_step,
            "evidence_summary": evidence_summary,
            "concern_kinds": concern_kinds or [],
        }
        if review_task_id is not None:
            review_payload["review_task_id"] = review_task_id
        review_payload.update(payload or {})
        activity = await repos.hypothesis_activities.add(
            hypothesis_id=hypothesis_id,
            created_in_session_id=ctx.deps.session_id,
            actor=actor,
            kind="comment",
            body=review,
            payload=review_payload,
        )
        event = await ctx.deps.record_event(
            event_type="hypothesis.review_added",
            message=review,
            payload={
                "activity_id": activity.id,
                "hypothesis_id": hypothesis_id,
                "verdict": verdict,
                "recommended_next_step": recommended_next_step,
                "review_task_id": review_task_id,
            },
        )
        await ctx.deps.publish_record(record=activity, event=event)
        return AddHypothesisReviewResult(success=True, activity=activity.model_dump())
