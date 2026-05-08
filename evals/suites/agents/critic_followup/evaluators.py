from __future__ import annotations

import json
from dataclasses import dataclass, field
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


def _lineage_decisions(output: CriticFollowupEvalOutput) -> list[dict[str, Any]]:
    return [
        activity
        for activity in output.project_board.get("experiment_activities", [])
        if (activity.get("payload") or {}).get("activity_type")
        == "lineage_decision"
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


@dataclass
class ManagerToolCalledSuccessfully(
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
            reason=f"Manager {self.tool_name} called successfully {len(matches)} time(s)",
        )


@dataclass
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
    allowed: list[str] = field(default_factory=list)

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
    needles: list[str] = field(default_factory=list)

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
class LineageDecisionRecorded(
    Evaluator[CriticFollowupEvalInput, CriticFollowupEvalOutput, Any]
):
    decision: str
    experiment_id: str

    def evaluate(
        self,
        ctx: EvaluatorContext[CriticFollowupEvalInput, CriticFollowupEvalOutput, Any],
    ) -> EvaluationReason:
        decisions = [
            activity
            for activity in _lineage_decisions(ctx.output)
            if activity.get("experiment_id") == self.experiment_id
            and (activity.get("payload") or {}).get("decision") == self.decision
        ]
        if decisions:
            return EvaluationReason(
                value=True,
                reason=(
                    f"Found lineage decision {self.decision!r} on "
                    f"{self.experiment_id}"
                ),
            )
        return EvaluationReason(
            value=False,
            reason=(
                f"No lineage decision {self.decision!r} on {self.experiment_id}. "
                f"Lineage activities: {_lineage_decisions(ctx.output)}"
            ),
        )


@dataclass
class FollowupTaskCarriesLineagePayload(
    Evaluator[CriticFollowupEvalInput, CriticFollowupEvalOutput, Any]
):
    parent_experiment_id: str
    research_thread: str
    base_commit: str

    def evaluate(
        self,
        ctx: EvaluatorContext[CriticFollowupEvalInput, CriticFollowupEvalOutput, Any],
    ) -> EvaluationReason:
        expected = {
            "parent_experiment_id": self.parent_experiment_id,
            "research_thread": self.research_thread,
            "base_commit": self.base_commit,
        }
        matches = [
            task
            for task in _manager_created_tasks(ctx.output)
            if all((task.get("payload") or {}).get(key) == value for key, value in expected.items())
        ]
        if matches:
            return EvaluationReason(
                value=True,
                reason=(
                    "Follow-up task carries lineage payload: "
                    f"{[task.get('id') for task in matches]}"
                ),
            )
        return EvaluationReason(
            value=False,
            reason=(
                f"No follow-up task carried lineage payload {expected}. "
                f"Tasks: {_manager_created_tasks(ctx.output)}"
            ),
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
