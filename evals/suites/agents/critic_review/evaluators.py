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
                    "Recorded Critic review activity ids: "
                    f"{[item.get('id') for item in reviews]}"
                ),
            )
        return EvaluationReason(
            value=False,
            reason="No experiment activity with payload.activity_type=critic_review",
        )


@dataclass
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
        evaluation_ids = {str(item) for item in payload.get("reviewed_evaluation_ids") or []}
        measurement_ids = {
            str(item)
            for item in payload.get("reviewed_measurement_ids") or []
            if isinstance(item, str) and item.startswith("M")
        }
        if not evaluation_ids or not measurement_ids:
            return EvaluationReason(
                value=False,
                reason=(
                    "Review did not cite both evaluation and measurement evidence. "
                    f"Payload: {payload}"
                ),
            )

        evaluations_by_id = {
            evaluation.get("id"): evaluation
            for evaluation in ctx.output.project_overview.get("evaluations", [])
        }
        measurements_by_id = {
            str(measurement.get("id")): measurement
            for measurement in ctx.output.project_overview.get("measurements", [])
            if measurement.get("id") is not None
        }
        missing_evaluations = sorted(
            evaluation_id
            for evaluation_id in evaluation_ids
            if evaluation_id not in evaluations_by_id
        )
        missing_measurements = sorted(
            measurement_id
            for measurement_id in measurement_ids
            if measurement_id not in measurements_by_id
        )
        if missing_evaluations or missing_measurements:
            return EvaluationReason(
                value=False,
                reason=(
                    "Review cited missing evidence. "
                    f"missing_evaluations={missing_evaluations}, "
                    f"missing_measurements={missing_measurements}"
                ),
            )

        experiment_id = review.get("experiment_id")
        review_tasks = [
            task
            for task in ctx.output.project_overview.get("tasks", [])
            if task.get("kind") == "review"
            and (task.get("payload") or {}).get("experiment_id") == experiment_id
        ]
        task_evaluation_ids = {
            str(evaluation_id)
            for task in review_tasks
            for evaluation_id in (task.get("payload") or {}).get("evaluation_ids", [])
        }
        task_measurement_ids = {
            str(measurement_id)
            for task in review_tasks
            for measurement_id in (task.get("payload") or {}).get("measurement_ids", [])
            if isinstance(measurement_id, str) and measurement_id.startswith("M")
        }
        if evaluation_ids & task_evaluation_ids and measurement_ids & task_measurement_ids:
            return EvaluationReason(
                value=True,
                reason=(
                    "Review referenced linked task evidence: "
                    f"evaluations={sorted(evaluation_ids)}, "
                    f"measurements={sorted(measurement_ids)}"
                ),
            )
        return EvaluationReason(
            value=False,
            reason=(
                "Review evidence did not overlap the review task payload. "
                f"review_evaluations={sorted(evaluation_ids)}, "
                f"task_evaluations={sorted(task_evaluation_ids)}, "
                f"review_measurements={sorted(measurement_ids)}, "
                f"task_measurements={sorted(task_measurement_ids)}"
            ),
        )


@dataclass
class CriticVerdictIn(
    Evaluator[CriticReviewEvalInput, CriticReviewEvalOutput, Any]
):
    allowed: list[str] = field(default_factory=list)

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
class ReviewTaskCompletedByCritic(
    Evaluator[CriticReviewEvalInput, CriticReviewEvalOutput, Any]
):
    def evaluate(
        self,
        ctx: EvaluatorContext[CriticReviewEvalInput, CriticReviewEvalOutput, Any],
    ) -> EvaluationReason:
        agents_by_id = {
            agent.get("id"): agent
            for agent in ctx.output.project_overview.get("agents", [])
        }
        matches = [
            task
            for task in ctx.output.project_overview.get("tasks", [])
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
                f"{ctx.output.project_overview.get('tasks', [])}"
            ),
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
