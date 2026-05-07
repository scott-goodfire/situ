from __future__ import annotations

import json
from dataclasses import dataclass
from typing import Any

from pydantic_evals.evaluators import EvaluationReason, Evaluator, EvaluatorContext

from evals.worlds.app_session_loop import (
    AppSessionLoopEvalInput,
    AppSessionLoopEvalOutput,
)


def _done_planning_pass_count(tasks: list[dict[str, Any]]) -> int:
    done_plans = [
        task
        for task in tasks
        if task.get("kind") == "plan" and task.get("status") == "done"
    ]
    payload_counts: list[int] = []
    for task in done_plans:
        payload = task.get("payload") if isinstance(task.get("payload"), dict) else {}
        raw_count = payload.get("planning_pass_count", 0)
        try:
            payload_counts.append(int(raw_count))
        except (TypeError, ValueError):
            continue
    return max(payload_counts, default=len(done_plans))


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


@dataclass
class PlanningPassCountAtLeast(
    Evaluator[AppSessionLoopEvalInput, AppSessionLoopEvalOutput, Any]
):
    count: int = 1

    def evaluate(
        self,
        ctx: EvaluatorContext[AppSessionLoopEvalInput, AppSessionLoopEvalOutput, Any],
    ) -> EvaluationReason:
        tasks = ctx.output.project_board.get("tasks", [])
        pass_count = _done_planning_pass_count(tasks)
        if pass_count >= self.count:
            return EvaluationReason(
                value=True,
                reason=f"Found {pass_count} completed planning pass(es)",
            )
        return EvaluationReason(
            value=False,
            reason=(
                f"Expected at least {self.count} completed planning pass(es). "
                f"Tasks: {tasks}"
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
        planning_pass_count = _done_planning_pass_count(tasks)
        if done_baseline and done_followup and planning_pass_count >= 2:
            return EvaluationReason(
                value=True,
                reason=(
                    "Baseline completed and later follow-up agent work completed. "
                    f"planning passes: {planning_pass_count}; "
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


class CommandReceiptArtifactCaptured(
    Evaluator[AppSessionLoopEvalInput, AppSessionLoopEvalOutput, Any]
):
    def evaluate(
        self,
        ctx: EvaluatorContext[AppSessionLoopEvalInput, AppSessionLoopEvalOutput, Any],
    ) -> EvaluationReason:
        artifacts = [
            artifact
            for artifact in ctx.output.project_board.get("artifacts", [])
            if artifact.get("kind") == "command_receipt"
        ]
        links = ctx.output.project_board.get("task_entity_links", [])
        linked_artifact_ids = {
            link.get("entity_id")
            for link in links
            if link.get("entity_kind") == "artifact"
            and link.get("relationship") == "receipt"
        }
        for artifact in artifacts:
            artifact_id = artifact.get("id")
            receipt_text = ctx.output.artifact_files.get(str(artifact_id), "")
            try:
                receipt = json.loads(receipt_text)
            except json.JSONDecodeError:
                continue
            rendered = json.dumps(receipt, sort_keys=True).lower()
            if (
                artifact_id in linked_artifact_ids
                and receipt.get("exit_code") == 0
                and "python train.py" in rendered
                and "val_bpb" in rendered
                and "component_a" in rendered
            ):
                return EvaluationReason(
                    value=True,
                    reason=(
                        "Found linked command receipt artifact with candidate "
                        f"measurement evidence: {artifact_id}"
                    ),
                )
        return EvaluationReason(
            value=False,
            reason=(
                "Expected a linked command_receipt artifact containing "
                "candidate python train.py output with val_bpb/component_a. "
                f"Artifacts: {artifacts}; links: {links}; "
                f"artifact_files: {sorted(ctx.output.artifact_files)}"
            ),
        )


class PatchHandoffArtifactCaptured(
    Evaluator[AppSessionLoopEvalInput, AppSessionLoopEvalOutput, Any]
):
    def evaluate(
        self,
        ctx: EvaluatorContext[AppSessionLoopEvalInput, AppSessionLoopEvalOutput, Any],
    ) -> EvaluationReason:
        artifacts = [
            artifact
            for artifact in ctx.output.project_board.get("artifacts", [])
            if artifact.get("kind") == "patch"
        ]
        links = ctx.output.project_board.get("task_entity_links", [])
        produced_artifact_ids = {
            link.get("entity_id")
            for link in links
            if link.get("entity_kind") == "artifact"
            and link.get("relationship") == "produces"
        }
        activities = ctx.output.project_board.get("experiment_activities", [])
        handoffs = [
            activity
            for activity in activities
            if (activity.get("payload") or {}).get("activity_type") == "patch_handoff"
        ]
        handoff_artifact_ids = {
            (activity.get("payload") or {}).get("artifact_id")
            for activity in handoffs
        }
        for artifact in artifacts:
            artifact_id = artifact.get("id")
            patch = ctx.output.artifact_files.get(str(artifact_id), "")
            if (
                artifact_id in produced_artifact_ids
                and artifact_id in handoff_artifact_ids
                and "diff --git a/train.py b/train.py" in patch
                and "component_a" in patch
                and "prepare.py" not in patch
            ):
                return EvaluationReason(
                    value=True,
                    reason=(
                        "Found patch handoff artifact linked to the experiment "
                        f"task: {artifact_id}"
                    ),
                )
        return EvaluationReason(
            value=False,
            reason=(
                "Expected patch artifact for train.py-only candidate with "
                "patch_handoff activity and task link. "
                f"Artifacts: {artifacts}; links: {links}; handoffs: {handoffs}; "
                f"artifact_files: {sorted(ctx.output.artifact_files)}"
            ),
        )


class ExperimentCandidateStateRecorded(
    Evaluator[AppSessionLoopEvalInput, AppSessionLoopEvalOutput, Any]
):
    def evaluate(
        self,
        ctx: EvaluatorContext[AppSessionLoopEvalInput, AppSessionLoopEvalOutput, Any],
    ) -> EvaluationReason:
        experiments = ctx.output.project_board.get("experiments", [])
        candidate_experiments = [
            experiment
            for experiment in experiments
            if experiment.get("base_commit") and experiment.get("candidate_commit")
        ]
        workspace_state = [
            activity
            for activity in ctx.output.project_board.get("experiment_activities", [])
            if (activity.get("payload") or {}).get("activity_type")
            == "workspace_state"
            and (activity.get("payload") or {}).get("candidate_commit")
            and (activity.get("payload") or {}).get("patch_artifact_id")
        ]
        if candidate_experiments and workspace_state:
            return EvaluationReason(
                value=True,
                reason=(
                    "Found experiment base/candidate commits and workspace "
                    f"state activity: {[item.get('id') for item in candidate_experiments]}"
                ),
            )
        return EvaluationReason(
            value=False,
            reason=(
                "Expected experiment candidate state and workspace_state "
                f"activity with patch_artifact_id. Experiments: {experiments}; "
                f"activities: {ctx.output.project_board.get('experiment_activities', [])}"
            ),
        )
