from __future__ import annotations

import json
from dataclasses import dataclass, field
from typing import Any

from pydantic_evals.evaluators import EvaluationReason, Evaluator, EvaluatorContext

from evals.worlds.critic_review import (
    CriticReviewEvalInput,
    CriticReviewEvalOutput,
)


def _review_activities(output: CriticReviewEvalOutput) -> list[dict[str, Any]]:
    return [
        activity
        for activity in output.project_overview.get("experiment_activities", [])
        if activity.get("kind") == "comment"
        and activity.get("actor") in {"agent", "critic"}
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
class CriticToolArgsContain(
    Evaluator[CriticReviewEvalInput, CriticReviewEvalOutput, Any]
):
    tool_name: str
    text: str

    def evaluate(
        self,
        ctx: EvaluatorContext[CriticReviewEvalInput, CriticReviewEvalOutput, Any],
    ) -> EvaluationReason:
        matches = [
            call
            for call in ctx.output.critic_tool_calls
            if call.tool_name == self.tool_name
        ]
        needle = self.text.lower()
        for call in matches:
            rendered = json.dumps(call.args, sort_keys=True).lower()
            if needle in rendered:
                return EvaluationReason(
                    value=True,
                    reason=f"Critic {self.tool_name} args contain {self.text!r}",
                )
        return EvaluationReason(
            value=False,
            reason=(
                f"Critic {self.tool_name} args did not contain {self.text!r}: "
                f"{[call.args for call in matches]}"
            ),
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


@dataclass
class CriticToolCalledSuccessfully(
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
            reason=f"Critic {self.tool_name} called successfully {len(matches)} time(s)",
        )


@dataclass
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
                    "Recorded Critic transition comment ids: "
                    f"{[item.get('id') for item in reviews]}"
                ),
            )
        return EvaluationReason(
            value=False,
            reason="No Critic transition comment on the experiment",
        )


@dataclass
class CriticReviewMentionsAny(
    Evaluator[CriticReviewEvalInput, CriticReviewEvalOutput, Any]
):
    needles: list[str] = field(default_factory=list)

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


@dataclass
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
            "add_measurement",
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
