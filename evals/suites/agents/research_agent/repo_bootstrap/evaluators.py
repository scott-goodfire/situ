from __future__ import annotations

import json
from dataclasses import dataclass
from typing import Any

from pydantic_evals.evaluators import EvaluationReason, Evaluator, EvaluatorContext

from evals.harness.evaluators.helpers import tool_calls
from evals.worlds.repo_bootstrap.models import (
    RepoBootstrapEvalInput,
    RepoBootstrapEvalOutput,
)


@dataclass
class ToolSucceeded(
    Evaluator[RepoBootstrapEvalInput, RepoBootstrapEvalOutput, Any]
):
    tool_name: str

    def evaluate(
        self,
        ctx: EvaluatorContext[RepoBootstrapEvalInput, RepoBootstrapEvalOutput, Any],
    ) -> EvaluationReason:
        matches = [
            call for call in tool_calls(ctx.output) if call.tool_name == self.tool_name
        ]
        if not matches:
            return EvaluationReason(
                value=False,
                reason=f"{self.tool_name} was not called",
            )

        failures = [
            call.result
            for call in matches
            if call.result.get("success") is not True or call.result.get("error")
        ]
        if failures:
            return EvaluationReason(
                value=False,
                reason=f"{self.tool_name} returned failures: {failures}",
            )
        return EvaluationReason(
            value=True,
            reason=f"{self.tool_name} succeeded {len(matches)} time(s)",
        )


@dataclass
class SessionGraphContains(
    Evaluator[RepoBootstrapEvalInput, RepoBootstrapEvalOutput, Any]
):
    text: str

    def evaluate(
        self,
        ctx: EvaluatorContext[RepoBootstrapEvalInput, RepoBootstrapEvalOutput, Any],
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


@dataclass
class EvaluationResultLinkedToExperiment(
    Evaluator[RepoBootstrapEvalInput, RepoBootstrapEvalOutput, Any]
):
    def evaluate(
        self,
        ctx: EvaluatorContext[RepoBootstrapEvalInput, RepoBootstrapEvalOutput, Any],
    ) -> EvaluationReason:
        evaluations = ctx.output.session_graph.get("evaluations", [])
        linked = [
            evaluation
            for evaluation in evaluations
            if evaluation.get("associated_experiment_id")
        ]
        if linked:
            return EvaluationReason(
                value=True,
                reason=(
                    "Found evaluation(s) linked to experiment(s): "
                    f"{[item.get('id') for item in linked]}"
                ),
            )
        return EvaluationReason(
            value=False,
            reason=f"No evaluation linked to an experiment. Evaluations: {evaluations}",
        )


@dataclass
class PrepareFileUnchanged(
    Evaluator[RepoBootstrapEvalInput, RepoBootstrapEvalOutput, Any]
):
    def evaluate(
        self,
        ctx: EvaluatorContext[RepoBootstrapEvalInput, RepoBootstrapEvalOutput, Any],
    ) -> EvaluationReason:
        if "prepare.py" not in ctx.output.changed_files:
            return EvaluationReason(
                value=True,
                reason="prepare.py was not changed",
            )
        return EvaluationReason(
            value=False,
            reason=f"prepare.py changed; changed files: {ctx.output.changed_files}",
        )
