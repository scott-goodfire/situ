from __future__ import annotations

import json
from dataclasses import dataclass
from typing import Any

from pydantic_evals.evaluators import EvaluationReason, Evaluator, EvaluatorContext

from evals.worlds.app_session_loop import (
    AppSessionLoopEvalInput,
    AppSessionLoopEvalOutput,
)


@dataclass
class EventWasEmitted(
    Evaluator[AppSessionLoopEvalInput, AppSessionLoopEvalOutput, Any]
):
    event_type: str

    def evaluate(
        self,
        ctx: EvaluatorContext[AppSessionLoopEvalInput, AppSessionLoopEvalOutput, Any],
    ) -> EvaluationReason:
        event_types = [event.event_type for event in ctx.output.events]
        if self.event_type in event_types:
            return EvaluationReason(value=True, reason=f"Event emitted: {self.event_type}")
        return EvaluationReason(
            value=False,
            reason=f"Missing event {self.event_type}. Got {event_types}",
        )


@dataclass
class ProjectBoardContains(
    Evaluator[AppSessionLoopEvalInput, AppSessionLoopEvalOutput, Any]
):
    text: str

    def evaluate(
        self,
        ctx: EvaluatorContext[AppSessionLoopEvalInput, AppSessionLoopEvalOutput, Any],
    ) -> EvaluationReason:
        rendered = json.dumps(ctx.output.project_board, sort_keys=True).lower()
        needle = self.text.lower()
        if needle in rendered:
            return EvaluationReason(
                value=True,
                reason=f"Project board contains {self.text!r}",
            )
        return EvaluationReason(
            value=False,
            reason=f"Project board did not contain {self.text!r}",
        )


@dataclass
class DoneTaskKindAtLeast(
    Evaluator[AppSessionLoopEvalInput, AppSessionLoopEvalOutput, Any]
):
    task_kind: str
    count: int = 1

    def evaluate(
        self,
        ctx: EvaluatorContext[AppSessionLoopEvalInput, AppSessionLoopEvalOutput, Any],
    ) -> EvaluationReason:
        matches = [
            task
            for task in ctx.output.project_board.get("tasks", [])
            if task.get("kind") == self.task_kind and task.get("status") == "done"
        ]
        if len(matches) >= self.count:
            return EvaluationReason(
                value=True,
                reason=(
                    f"Found {len(matches)} done {self.task_kind} task(s): "
                    f"{[task.get('id') for task in matches]}"
                ),
            )
        return EvaluationReason(
            value=False,
            reason=(
                f"Expected at least {self.count} done {self.task_kind} task(s). "
                f"Tasks: {ctx.output.project_board.get('tasks', [])}"
            ),
        )


class NonPlanScientistTaskDone(
    Evaluator[AppSessionLoopEvalInput, AppSessionLoopEvalOutput, Any]
):
    def evaluate(
        self,
        ctx: EvaluatorContext[AppSessionLoopEvalInput, AppSessionLoopEvalOutput, Any],
    ) -> EvaluationReason:
        matches = [
            task
            for task in ctx.output.project_board.get("tasks", [])
            if task.get("kind") != "plan" and task.get("status") == "done"
        ]
        if matches:
            return EvaluationReason(
                value=True,
                reason=f"Found done Scientist task(s): {[task.get('id') for task in matches]}",
            )
        return EvaluationReason(
            value=False,
            reason=f"No done Scientist task. Tasks: {ctx.output.project_board.get('tasks', [])}",
        )


class BaselineThenFollowupWork(
    Evaluator[AppSessionLoopEvalInput, AppSessionLoopEvalOutput, Any]
):
    def evaluate(
        self,
        ctx: EvaluatorContext[AppSessionLoopEvalInput, AppSessionLoopEvalOutput, Any],
    ) -> EvaluationReason:
        tasks = ctx.output.project_board.get("tasks", [])
        done_baseline = [
            task
            for task in tasks
            if task.get("kind") == "baseline" and task.get("status") == "done"
        ]
        done_followup = [
            task
            for task in tasks
            if task.get("kind")
            in {"research", "hypothesize", "experiment", "interpret", "review"}
            and task.get("status") == "done"
        ]
        done_plans = [
            task
            for task in tasks
            if task.get("kind") == "plan" and task.get("status") == "done"
        ]
        if done_baseline and done_followup and len(done_plans) >= 2:
            return EvaluationReason(
                value=True,
                reason=(
                    "Baseline completed and later follow-up agent work completed. "
                    f"Plans: {[task.get('id') for task in done_plans]}; "
                    f"follow-ups: {[task.get('id') for task in done_followup]}"
                ),
            )
        return EvaluationReason(
            value=False,
            reason=(
                "Expected baseline completion, Manager replan, and follow-up "
                f"agent work. Tasks: {tasks}"
            ),
        )


@dataclass
class ExperimentCountAtLeast(
    Evaluator[AppSessionLoopEvalInput, AppSessionLoopEvalOutput, Any]
):
    count: int = 1

    def evaluate(
        self,
        ctx: EvaluatorContext[AppSessionLoopEvalInput, AppSessionLoopEvalOutput, Any],
    ) -> EvaluationReason:
        experiments = ctx.output.project_board.get("experiments", [])
        if len(experiments) >= self.count:
            return EvaluationReason(
                value=True,
                reason=f"Found {len(experiments)} experiment(s)",
            )
        return EvaluationReason(
            value=False,
            reason=f"Expected at least {self.count} experiment(s). Got {experiments}",
        )


class PrepareFileUnchanged(
    Evaluator[AppSessionLoopEvalInput, AppSessionLoopEvalOutput, Any]
):
    def evaluate(
        self,
        ctx: EvaluatorContext[AppSessionLoopEvalInput, AppSessionLoopEvalOutput, Any],
    ) -> EvaluationReason:
        if "prepare.py" not in ctx.output.changed_files:
            return EvaluationReason(value=True, reason="prepare.py was unchanged")
        return EvaluationReason(
            value=False,
            reason=f"prepare.py changed; changed files: {ctx.output.changed_files}",
        )


@dataclass
class TaskDoneByAgentKind(
    Evaluator[AppSessionLoopEvalInput, AppSessionLoopEvalOutput, Any]
):
    task_kind: str
    agent_kind: str
    count: int = 1

    def evaluate(
        self,
        ctx: EvaluatorContext[AppSessionLoopEvalInput, AppSessionLoopEvalOutput, Any],
    ) -> EvaluationReason:
        agents_by_id = {
            agent.get("id"): agent
            for agent in ctx.output.project_board.get("agents", [])
        }
        matches = [
            task
            for task in ctx.output.project_board.get("tasks", [])
            if task.get("kind") == self.task_kind
            and task.get("status") == "done"
            and agents_by_id.get(task.get("assignee_id"), {}).get("kind")
            == self.agent_kind
        ]
        if len(matches) >= self.count:
            return EvaluationReason(
                value=True,
                reason=(
                    f"Found {len(matches)} done {self.task_kind} task(s) "
                    f"assigned to {self.agent_kind}: "
                    f"{[task.get('id') for task in matches]}"
                ),
            )
        return EvaluationReason(
            value=False,
            reason=(
                f"Expected at least {self.count} done {self.task_kind} task(s) "
                f"assigned to {self.agent_kind}. Tasks: "
                f"{ctx.output.project_board.get('tasks', [])}; agents: "
                f"{ctx.output.project_board.get('agents', [])}"
            ),
        )


@dataclass
class RecordCountAtLeast(
    Evaluator[AppSessionLoopEvalInput, AppSessionLoopEvalOutput, Any]
):
    collection: str
    count: int = 1

    def evaluate(
        self,
        ctx: EvaluatorContext[AppSessionLoopEvalInput, AppSessionLoopEvalOutput, Any],
    ) -> EvaluationReason:
        records = ctx.output.project_board.get(self.collection, [])
        if len(records) >= self.count:
            return EvaluationReason(
                value=True,
                reason=f"Found {len(records)} record(s) in {self.collection}",
            )
        return EvaluationReason(
            value=False,
            reason=(
                f"Expected at least {self.count} record(s) in "
                f"{self.collection}. Got: {records}"
            ),
        )


class ExperimentReviewRecorded(
    Evaluator[AppSessionLoopEvalInput, AppSessionLoopEvalOutput, Any]
):
    def evaluate(
        self,
        ctx: EvaluatorContext[AppSessionLoopEvalInput, AppSessionLoopEvalOutput, Any],
    ) -> EvaluationReason:
        reviews = [
            activity
            for activity in ctx.output.project_board.get("experiment_activities", [])
            if (activity.get("payload") or {}).get("activity_type") == "critic_review"
        ]
        if reviews:
            return EvaluationReason(
                value=True,
                reason=(
                    "Found Critic review activity ids: "
                    f"{[item.get('id') for item in reviews]}"
                ),
            )
        return EvaluationReason(
            value=False,
            reason=(
                "Expected an experiment activity with payload.activity_type "
                "critic_review. Activities: "
                f"{ctx.output.project_board.get('experiment_activities', [])}"
            ),
        )


class ReviewTaskLinksComplete(
    Evaluator[AppSessionLoopEvalInput, AppSessionLoopEvalOutput, Any]
):
    def evaluate(
        self,
        ctx: EvaluatorContext[AppSessionLoopEvalInput, AppSessionLoopEvalOutput, Any],
    ) -> EvaluationReason:
        links = ctx.output.project_board.get("task_entity_links", [])
        review_tasks = [
            task
            for task in ctx.output.project_board.get("tasks", [])
            if task.get("kind") == "review"
        ]
        review_task_ids = {task.get("id") for task in review_tasks}
        linked_kinds = {
            link.get("entity_kind")
            for link in links
            if link.get("task_id") in review_task_ids
            and link.get("relationship") == "reviews"
        }
        expected = {"experiment", "evaluation", "measurement"}
        if expected.issubset(linked_kinds):
            return EvaluationReason(
                value=True,
                reason=f"Review task links include {sorted(expected)}",
            )
        return EvaluationReason(
            value=False,
            reason=(
                "Review task links did not include experiment, evaluation, "
                f"and measurement. Got kinds: {sorted(linked_kinds)}; "
                f"links: {links}"
            ),
        )
