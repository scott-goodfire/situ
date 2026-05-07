from __future__ import annotations

import json
from dataclasses import dataclass
from typing import Any

from pydantic_evals.evaluators import EvaluationReason, Evaluator, EvaluatorContext

from evals.worlds.critic_review import (
    CriticReviewEvalInput,
    CriticReviewEvalOutput,
)


def _review_activities(output: CriticReviewEvalOutput) -> list[dict[str, Any]]:
    return [
        activity
        for activity in output.project_board.get("experiment_activities", [])
        if (activity.get("payload") or {}).get("activity_type") == "critic_review"
    ]


def _latest_review(output: CriticReviewEvalOutput) -> dict[str, Any] | None:
    reviews = _review_activities(output)
    return reviews[-1] if reviews else None


@dataclass
class CriticToolWasCalled(
    Evaluator[CriticReviewEvalInput, CriticReviewEvalOutput, Any]
):
    tool_name: str
    expected: bool = True

    def evaluate(
        self,
        ctx: EvaluatorContext[CriticReviewEvalInput, CriticReviewEvalOutput, Any],
    ) -> EvaluationReason:
        matches = [
            call
            for call in ctx.output.critic_tool_calls
            if call.tool_name == self.tool_name
        ]
        found = bool(matches)
        if found == self.expected:
            reason = (
                f"Critic {self.tool_name} called {len(matches)} time(s)"
                if found
                else f"Critic {self.tool_name} not called"
            )
            return EvaluationReason(value=True, reason=reason)
        if self.expected:
            return EvaluationReason(
                value=False,
                reason=f"Expected Critic to call {self.tool_name}",
            )
        return EvaluationReason(
            value=False,
            reason=f"Expected Critic not to call {self.tool_name}",
        )


@dataclass
class CriticToolSucceeded(
    Evaluator[CriticReviewEvalInput, CriticReviewEvalOutput, Any]
):
    tool_name: str

    def evaluate(
        self,
        ctx: EvaluatorContext[CriticReviewEvalInput, CriticReviewEvalOutput, Any],
    ) -> EvaluationReason:
        matches = [
            call
            for call in ctx.output.critic_tool_calls
            if call.tool_name == self.tool_name
        ]
        if not matches:
            return EvaluationReason(
                value=False,
                reason=f"Critic did not call {self.tool_name}",
            )
        failures = [
            call.result
            for call in matches
            if call.result.get("success") is not True or call.result.get("error")
        ]
        if failures:
            return EvaluationReason(
                value=False,
                reason=f"Critic {self.tool_name} failures: {failures}",
            )
        return EvaluationReason(
            value=True,
            reason=f"Critic {self.tool_name} succeeded {len(matches)} time(s)",
        )


class CriticReviewRecorded(
    Evaluator[CriticReviewEvalInput, CriticReviewEvalOutput, Any]
):
    def evaluate(
        self,
        ctx: EvaluatorContext[CriticReviewEvalInput, CriticReviewEvalOutput, Any],
    ) -> EvaluationReason:
        reviews = _review_activities(ctx.output)
        if reviews:
            return EvaluationReason(
                value=True,
                reason=(
                    "Recorded Critic review activity ids: "
                    f"{[item.get('id') for item in reviews]}"
                ),
            )
        return EvaluationReason(
            value=False,
            reason="No experiment activity with payload.activity_type=critic_review",
        )


class CriticReviewReferencesEvidence(
    Evaluator[CriticReviewEvalInput, CriticReviewEvalOutput, Any]
):
    def evaluate(
        self,
        ctx: EvaluatorContext[CriticReviewEvalInput, CriticReviewEvalOutput, Any],
    ) -> EvaluationReason:
        review = _latest_review(ctx.output)
        if review is None:
            return EvaluationReason(value=False, reason="No Critic review found")
        payload = review.get("payload") or {}
        evaluation_ids = payload.get("reviewed_evaluation_ids") or []
        measurement_ids = payload.get("reviewed_measurement_ids") or []
        if evaluation_ids and measurement_ids:
            return EvaluationReason(
                value=True,
                reason=(
                    "Review referenced evidence: "
                    f"evaluations={evaluation_ids}, measurements={measurement_ids}"
                ),
            )
        return EvaluationReason(
            value=False,
            reason=(
                "Review did not cite both evaluation and measurement evidence. "
                f"Payload: {payload}"
            ),
        )


@dataclass
class CriticVerdictIn(
    Evaluator[CriticReviewEvalInput, CriticReviewEvalOutput, Any]
):
    allowed: tuple[str, ...]

    def __init__(self, *allowed: str) -> None:
        self.allowed = allowed

    def evaluate(
        self,
        ctx: EvaluatorContext[CriticReviewEvalInput, CriticReviewEvalOutput, Any],
    ) -> EvaluationReason:
        review = _latest_review(ctx.output)
        if review is None:
            return EvaluationReason(value=False, reason="No Critic review found")
        verdict = (review.get("payload") or {}).get("verdict")
        if verdict in self.allowed:
            return EvaluationReason(
                value=True,
                reason=f"Review verdict {verdict!r} is allowed",
            )
        return EvaluationReason(
            value=False,
            reason=f"Review verdict {verdict!r} not in {self.allowed}",
        )


@dataclass
class CriticReviewMentionsAny(
    Evaluator[CriticReviewEvalInput, CriticReviewEvalOutput, Any]
):
    needles: tuple[str, ...]

    def __init__(self, *needles: str) -> None:
        self.needles = needles

    def evaluate(
        self,
        ctx: EvaluatorContext[CriticReviewEvalInput, CriticReviewEvalOutput, Any],
    ) -> EvaluationReason:
        review = _latest_review(ctx.output)
        if review is None:
            return EvaluationReason(value=False, reason="No Critic review found")
        rendered = json.dumps(review, sort_keys=True).lower()
        matches = [needle for needle in self.needles if needle.lower() in rendered]
        if matches:
            return EvaluationReason(
                value=True,
                reason=f"Review mentioned concern text: {matches}",
            )
        return EvaluationReason(
            value=False,
            reason=f"Review did not mention any of {self.needles}",
        )


class ReviewTaskCompletedByCritic(
    Evaluator[CriticReviewEvalInput, CriticReviewEvalOutput, Any]
):
    def evaluate(
        self,
        ctx: EvaluatorContext[CriticReviewEvalInput, CriticReviewEvalOutput, Any],
    ) -> EvaluationReason:
        agents_by_id = {
            agent.get("id"): agent
            for agent in ctx.output.project_board.get("agents", [])
        }
        matches = [
            task
            for task in ctx.output.project_board.get("tasks", [])
            if task.get("kind") == "review"
            and task.get("status") == "done"
            and agents_by_id.get(task.get("assignee_id"), {}).get("kind") == "critic"
        ]
        if matches:
            return EvaluationReason(
                value=True,
                reason=(
                    "Critic completed review tasks: "
                    f"{[task.get('id') for task in matches]}"
                ),
            )
        return EvaluationReason(
            value=False,
            reason=(
                "No done Critic review task. Tasks: "
                f"{ctx.output.project_board.get('tasks', [])}"
            ),
        )


class CriticDidNotCreateExperimentOrMeasurement(
    Evaluator[CriticReviewEvalInput, CriticReviewEvalOutput, Any]
):
    def evaluate(
        self,
        ctx: EvaluatorContext[CriticReviewEvalInput, CriticReviewEvalOutput, Any],
    ) -> EvaluationReason:
        forbidden = {
            "create_baseline",
            "create_experiment",
            "create_evaluation",
            "add_evaluation_result",
        }
        calls = [
            call.tool_name
            for call in ctx.output.critic_tool_calls
            if call.tool_name in forbidden
        ]
        if not calls:
            return EvaluationReason(
                value=True,
                reason="Critic did not create experiments, evaluations, or measurements",
            )
        return EvaluationReason(
            value=False,
            reason=f"Critic called write-side Scientist tools: {calls}",
        )
