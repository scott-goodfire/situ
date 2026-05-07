from __future__ import annotations

import json
from dataclasses import dataclass
from typing import Any

from pydantic_evals.evaluators import EvaluationReason, Evaluator, EvaluatorContext

from evals.worlds.critic_followup import (
    CriticFollowupEvalInput,
    CriticFollowupEvalOutput,
)


def _manager_created_tasks(output: CriticFollowupEvalOutput) -> list[dict[str, Any]]:
    return [
        task
        for task in output.project_board.get("tasks", [])
        if task.get("source_kind") == "manager"
        and task.get("kind") != "plan"
        and task.get("status") == "backlog"
    ]


def _task_text(task: dict[str, Any]) -> str:
    return json.dumps(
        {
            "kind": task.get("kind"),
            "title": task.get("title"),
            "content": task.get("content"),
            "payload": task.get("payload"),
        },
        sort_keys=True,
    ).lower()


@dataclass
class ManagerToolWasCalled(
    Evaluator[CriticFollowupEvalInput, CriticFollowupEvalOutput, Any]
):
    tool_name: str

    def evaluate(
        self,
        ctx: EvaluatorContext[CriticFollowupEvalInput, CriticFollowupEvalOutput, Any],
    ) -> EvaluationReason:
        matches = [
            call
            for call in ctx.output.manager_tool_calls
            if call.tool_name == self.tool_name
        ]
        if matches:
            return EvaluationReason(
                value=True,
                reason=f"Manager called {self.tool_name} {len(matches)} time(s)",
            )
        return EvaluationReason(
            value=False,
            reason=f"Manager did not call {self.tool_name}",
        )


@dataclass
class ManagerToolSucceeded(
    Evaluator[CriticFollowupEvalInput, CriticFollowupEvalOutput, Any]
):
    tool_name: str

    def evaluate(
        self,
        ctx: EvaluatorContext[CriticFollowupEvalInput, CriticFollowupEvalOutput, Any],
    ) -> EvaluationReason:
        matches = [
            call
            for call in ctx.output.manager_tool_calls
            if call.tool_name == self.tool_name
        ]
        if not matches:
            return EvaluationReason(
                value=False,
                reason=f"Manager did not call {self.tool_name}",
            )
        failures = [
            call.result
            for call in matches
            if call.result.get("success") is not True or call.result.get("error")
        ]
        if failures:
            return EvaluationReason(
                value=False,
                reason=f"Manager {self.tool_name} failures: {failures}",
            )
        return EvaluationReason(
            value=True,
            reason=f"Manager {self.tool_name} succeeded {len(matches)} time(s)",
        )


class ManagerCreatedFollowupTask(
    Evaluator[CriticFollowupEvalInput, CriticFollowupEvalOutput, Any]
):
    def evaluate(
        self,
        ctx: EvaluatorContext[CriticFollowupEvalInput, CriticFollowupEvalOutput, Any],
    ) -> EvaluationReason:
        tasks = _manager_created_tasks(ctx.output)
        if tasks:
            return EvaluationReason(
                value=True,
                reason=f"Manager created follow-up tasks: {[task.get('id') for task in tasks]}",
            )
        return EvaluationReason(
            value=False,
            reason=f"No Manager-created follow-up task. Tasks: {ctx.output.project_board.get('tasks', [])}",
        )


@dataclass
class FollowupTaskKindIn(
    Evaluator[CriticFollowupEvalInput, CriticFollowupEvalOutput, Any]
):
    allowed: tuple[str, ...]

    def __init__(self, *allowed: str) -> None:
        self.allowed = allowed

    def evaluate(
        self,
        ctx: EvaluatorContext[CriticFollowupEvalInput, CriticFollowupEvalOutput, Any],
    ) -> EvaluationReason:
        tasks = _manager_created_tasks(ctx.output)
        matches = [task for task in tasks if task.get("kind") in self.allowed]
        if matches:
            return EvaluationReason(
                value=True,
                reason=(
                    f"Found follow-up task kind in {self.allowed}: "
                    f"{[(task.get('id'), task.get('kind')) for task in matches]}"
                ),
            )
        return EvaluationReason(
            value=False,
            reason=f"No follow-up task kind in {self.allowed}. Tasks: {tasks}",
        )


@dataclass
class FollowupTaskMentionsAny(
    Evaluator[CriticFollowupEvalInput, CriticFollowupEvalOutput, Any]
):
    needles: tuple[str, ...]

    def __init__(self, *needles: str) -> None:
        self.needles = needles

    def evaluate(
        self,
        ctx: EvaluatorContext[CriticFollowupEvalInput, CriticFollowupEvalOutput, Any],
    ) -> EvaluationReason:
        tasks = _manager_created_tasks(ctx.output)
        matches = [
            task
            for task in tasks
            if any(needle.lower() in _task_text(task) for needle in self.needles)
        ]
        if matches:
            return EvaluationReason(
                value=True,
                reason=(
                    f"Follow-up task mentioned one of {self.needles}: "
                    f"{[task.get('id') for task in matches]}"
                ),
            )
        return EvaluationReason(
            value=False,
            reason=f"No follow-up task mentioned {self.needles}. Tasks: {tasks}",
        )


@dataclass
class ProjectBoardContainsReviewVerdict(
    Evaluator[CriticFollowupEvalInput, CriticFollowupEvalOutput, Any]
):
    verdict: str

    def evaluate(
        self,
        ctx: EvaluatorContext[CriticFollowupEvalInput, CriticFollowupEvalOutput, Any],
    ) -> EvaluationReason:
        rendered = json.dumps(ctx.output.project_board, sort_keys=True).lower()
        if self.verdict.lower() in rendered and "critic_review" in rendered:
            return EvaluationReason(
                value=True,
                reason=f"Project board contains Critic verdict {self.verdict!r}",
            )
        return EvaluationReason(
            value=False,
            reason=f"Project board did not contain Critic verdict {self.verdict!r}",
        )
