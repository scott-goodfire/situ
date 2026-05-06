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


def _enum_value(value: Any) -> Any:
    return getattr(value, "value", value)


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
        measurements = ctx.output.session_graph.get("measurements", [])
        activities = ctx.output.session_graph.get("evaluation_activities", [])
        result_measurements = [
            measurement
            for measurement in measurements
            if "val_bpb" in json.dumps(measurement, sort_keys=True).lower()
        ]
        result_activities = [
            activity
            for activity in activities
            if activity.get("kind") == "result"
            and "val_bpb" in json.dumps(activity, sort_keys=True).lower()
        ]
        if evaluations and (result_measurements or result_activities):
            return EvaluationReason(
                value=True,
                reason=(
                    "Found evaluation measurement evidence: "
                    f"{[item.get('id') for item in result_measurements or result_activities]}"
                ),
            )
        return EvaluationReason(
            value=False,
            reason=(
                "Missing baseline evaluation/measurement evidence. "
                f"Evaluations: {evaluations}; measurements: {measurements}; "
                f"activities: {activities}"
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


class CandidateExperimentRecorded(
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
        graph = ctx.output.session_graph
        experiments = graph.get("experiments", [])
        evaluations = graph.get("evaluations", [])
        activities = graph.get("evaluation_activities", [])
        experiment_ids = {
            experiment.get("id")
            for experiment in experiments
            if "component a" in json.dumps(experiment, sort_keys=True).lower()
            or "try component a" in json.dumps(experiment, sort_keys=True).lower()
        }
        linked_evaluations = [
            evaluation
            for evaluation in evaluations
            if evaluation.get("associated_experiment_id") in experiment_ids
        ]
        component_results = [
            activity
            for activity in activities
            if "component_a" in json.dumps(activity, sort_keys=True).lower()
            and "val_bpb" in json.dumps(activity, sort_keys=True).lower()
        ]
        if experiment_ids and linked_evaluations and component_results:
            return EvaluationReason(
                value=True,
                reason=(
                    "Found component A experiment, linked evaluation, and "
                    f"result evidence: {sorted(experiment_ids)}"
                ),
            )
        return EvaluationReason(
            value=False,
            reason=(
                "Missing component A experiment/evaluation/result. "
                f"Experiments: {experiments}; evaluations: {evaluations}; "
                f"activities: {activities}"
            ),
        )


class TrainOnlyChanged(
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
        changed = sorted(ctx.output.changed_files)
        if changed == ["train.py"]:
            return EvaluationReason(
                value=True,
                reason="Only train.py changed",
            )
        return EvaluationReason(
            value=False,
            reason=f"Expected only train.py to change; changed files: {changed}",
        )


class PrepareFileUnchanged(
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
        if "prepare.py" not in ctx.output.changed_files:
            return EvaluationReason(value=True, reason="prepare.py was unchanged")
        return EvaluationReason(
            value=False,
            reason=f"prepare.py changed; changed files: {ctx.output.changed_files}",
        )


class AnalysisRecorded(
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
        analyses = ctx.output.session_graph.get("analyses", [])
        activities = ctx.output.session_graph.get("analysis_activities", [])
        has_analysis = any(
            "codebase map" in json.dumps(analysis, sort_keys=True).lower()
            for analysis in analyses
        )
        has_comment = any(
            "analysis before hypotheses"
            in json.dumps(activity, sort_keys=True).lower()
            for activity in activities
        )
        if has_analysis and has_comment:
            return EvaluationReason(
                value=True,
                reason=f"Found analysis and analysis comment: {analyses}",
            )
        return EvaluationReason(
            value=False,
            reason=f"Missing analysis/comment. Analyses: {analyses}; activities: {activities}",
        )


@dataclass
class ScientistClaimedTaskContaining(
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
        needle = self.text.lower()
        matches = [
            call
            for call in calls_for_role(ctx.output, "scientist")
            if call.tool_name == "claim_task"
            and needle in json.dumps(call.result, sort_keys=True).lower()
        ]
        if matches:
            return EvaluationReason(
                value=True,
                reason=f"Scientist claimed task containing {self.text!r}",
            )
        return EvaluationReason(
            value=False,
            reason=(
                f"Scientist did not claim task containing {self.text!r}. "
                f"Claim calls: {[call.result for call in calls_for_role(ctx.output, 'scientist') if call.tool_name == 'claim_task']}"
            ),
        )


class UserUrgentTaskPreemptedBacklog(
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
        urgent = [
            task
            for task in tasks
            if "user urgent" in str(task.get("title", "")).lower()
        ]
        normal = [
            task
            for task in tasks
            if "normal backlog" in str(task.get("title", "")).lower()
        ]
        urgent_claimed = any(
            _enum_value(task.get("status"))
            in {"in_progress", "done", "failed", "abandoned"}
            and task.get("assignee_id")
            for task in urgent
        )
        normal_backlog = any(
            _enum_value(task.get("status")) == "backlog" for task in normal
        )
        if urgent_claimed and normal_backlog:
            return EvaluationReason(
                value=True,
                reason="Urgent user task was claimed before normal backlog task",
            )
        return EvaluationReason(
            value=False,
            reason=f"Urgent/normal task priority did not hold. Tasks: {tasks}",
        )
