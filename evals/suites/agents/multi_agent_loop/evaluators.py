from __future__ import annotations

import json
from dataclasses import dataclass
from typing import Any

from pydantic_evals.evaluators import EvaluationReason, Evaluator, EvaluatorContext

from evals.worlds.multi_agent_loop import (
    MultiAgentLoopEvalInput,
    MultiAgentLoopEvalOutput,
)
from evals.worlds.multi_agent_loop.agents import calls_for_role


@dataclass
class RoleToolWasCalled(
    Evaluator[MultiAgentLoopEvalInput, MultiAgentLoopEvalOutput, Any]
):
    role: str
    tool_name: str
    expected: bool = True

    def evaluate(
        self,
        ctx: EvaluatorContext[
            MultiAgentLoopEvalInput,
            MultiAgentLoopEvalOutput,
            Any,
        ],
    ) -> EvaluationReason:
        matches = [
            call
            for call in calls_for_role(ctx.output, self.role)
            if call.tool_name == self.tool_name
        ]
        found = bool(matches)
        if found == self.expected:
            reason = (
                f"{self.role} {self.tool_name} called {len(matches)} time(s)"
                if found
                else f"{self.role} {self.tool_name} not called"
            )
            return EvaluationReason(value=True, reason=reason)
        if self.expected:
            return EvaluationReason(
                value=False,
                reason=f"Expected {self.role} to call {self.tool_name}",
            )
        return EvaluationReason(
            value=False,
            reason=f"Expected {self.role} not to call {self.tool_name}",
        )


@dataclass
class RoleToolSucceeded(
    Evaluator[MultiAgentLoopEvalInput, MultiAgentLoopEvalOutput, Any]
):
    role: str
    tool_name: str

    def evaluate(
        self,
        ctx: EvaluatorContext[
            MultiAgentLoopEvalInput,
            MultiAgentLoopEvalOutput,
            Any,
        ],
    ) -> EvaluationReason:
        matches = [
            call
            for call in calls_for_role(ctx.output, self.role)
            if call.tool_name == self.tool_name
        ]
        if not matches:
            return EvaluationReason(
                value=False,
                reason=f"{self.role} did not call {self.tool_name}",
            )
        failures = [
            call.result
            for call in matches
            if call.result.get("success") is not True or call.result.get("error")
        ]
        if failures:
            return EvaluationReason(
                value=False,
                reason=f"{self.role} {self.tool_name} failures: {failures}",
            )
        return EvaluationReason(
            value=True,
            reason=f"{self.role} {self.tool_name} succeeded {len(matches)} time(s)",
        )


@dataclass
class SessionGraphContains(
    Evaluator[MultiAgentLoopEvalInput, MultiAgentLoopEvalOutput, Any]
):
    text: str

    def evaluate(
        self,
        ctx: EvaluatorContext[
            MultiAgentLoopEvalInput,
            MultiAgentLoopEvalOutput,
            Any,
        ],
    ) -> EvaluationReason:
        rendered = json.dumps(ctx.output.session_graph, sort_keys=True).lower()
        needle = self.text.lower()
        if needle in rendered:
            return EvaluationReason(
                value=True,
                reason=f"Session graph contains {self.text!r}",
            )
        return EvaluationReason(
            value=False,
            reason=f"Session graph did not contain {self.text!r}",
        )


class ScientistCompletedBaselineTask(
    Evaluator[MultiAgentLoopEvalInput, MultiAgentLoopEvalOutput, Any]
):
    def evaluate(
        self,
        ctx: EvaluatorContext[
            MultiAgentLoopEvalInput,
            MultiAgentLoopEvalOutput,
            Any,
        ],
    ) -> EvaluationReason:
        tasks = ctx.output.session_graph.get("tasks", [])
        completed = [
            task
            for task in tasks
            if task.get("kind") == "baseline" and task.get("status") == "done"
        ]
        if completed:
            return EvaluationReason(
                value=True,
                reason=f"Completed baseline task(s): {[task.get('id') for task in completed]}",
            )
        return EvaluationReason(
            value=False,
            reason=f"No completed baseline task. Tasks: {tasks}",
        )


class BaselineEvaluationRecorded(
    Evaluator[MultiAgentLoopEvalInput, MultiAgentLoopEvalOutput, Any]
):
    def evaluate(
        self,
        ctx: EvaluatorContext[
            MultiAgentLoopEvalInput,
            MultiAgentLoopEvalOutput,
            Any,
        ],
    ) -> EvaluationReason:
        evaluations = ctx.output.session_graph.get("evaluations", [])
        activities = ctx.output.session_graph.get("evaluation_activities", [])
        result_activities = [
            activity
            for activity in activities
            if activity.get("kind") == "result"
            and "val_bpb" in json.dumps(activity, sort_keys=True).lower()
        ]
        if evaluations and result_activities:
            return EvaluationReason(
                value=True,
                reason=(
                    "Found evaluation result evidence: "
                    f"{[activity.get('id') for activity in result_activities]}"
                ),
            )
        return EvaluationReason(
            value=False,
            reason=(
                "Missing baseline evaluation/result evidence. "
                f"Evaluations: {evaluations}; activities: {activities}"
            ),
        )


class FollowupTaskCreatedAfterBaseline(
    Evaluator[MultiAgentLoopEvalInput, MultiAgentLoopEvalOutput, Any]
):
    def evaluate(
        self,
        ctx: EvaluatorContext[
            MultiAgentLoopEvalInput,
            MultiAgentLoopEvalOutput,
            Any,
        ],
    ) -> EvaluationReason:
        followups = [
            task
            for task in ctx.output.session_graph.get("tasks", [])
            if task.get("kind") in {"hypothesize", "experiment", "interpret", "review"}
        ]
        if followups:
            return EvaluationReason(
                value=True,
                reason=f"Found follow-up task(s): {[task.get('id') for task in followups]}",
            )
        return EvaluationReason(
            value=False,
            reason=(
                "Manager did not create a post-baseline follow-up task. Tasks: "
                f"{ctx.output.session_graph.get('tasks', [])}"
            ),
        )
