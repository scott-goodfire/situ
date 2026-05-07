from __future__ import annotations

from dataclasses import dataclass
from typing import Any

from pydantic_evals.evaluators import EvaluationReason, Evaluator, EvaluatorContext

from evals.worlds.app_session_loop import (
    AppSessionLoopEvalInput,
    AppSessionLoopEvalOutput,
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


class ManagerCompletedAfterCriticReview(
    Evaluator[AppSessionLoopEvalInput, AppSessionLoopEvalOutput, Any]
):
    def evaluate(
        self,
        ctx: EvaluatorContext[AppSessionLoopEvalInput, AppSessionLoopEvalOutput, Any],
    ) -> EvaluationReason:
        event_types = [event.event_type for event in ctx.output.events]
        try:
            critic_index = event_types.index("session.critic_completed")
        except ValueError:
            return EvaluationReason(
                value=False,
                reason=f"No Critic completion event. Got {event_types}",
            )
        for index, event_type in enumerate(
            event_types[critic_index + 1 :],
            start=critic_index + 1,
        ):
            if event_type == "session.manager_completed":
                return EvaluationReason(
                    value=True,
                    reason=f"Manager completed after Critic at event index {index}",
                )
        return EvaluationReason(
            value=False,
            reason=f"No Manager completion after Critic. Got {event_types}",
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
        expected = {"experiment", "evaluation", "measurement"}
        for task in review_tasks:
            linked_kinds = {
                link.get("entity_kind")
                for link in links
                if link.get("task_id") == task.get("id")
                and link.get("relationship") == "reviews"
            }
            if expected.issubset(linked_kinds):
                return EvaluationReason(
                    value=True,
                    reason=(
                        f"Review task {task.get('id')} links include "
                        f"{sorted(expected)}"
                    ),
                )
        return EvaluationReason(
            value=False,
            reason=(
                "No single review task linked experiment, evaluation, and "
                f"measurement evidence. Review tasks: {review_tasks}; links: {links}"
            ),
        )
