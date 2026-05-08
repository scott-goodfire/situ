from __future__ import annotations

from dataclasses import dataclass
from typing import Any

from pydantic_evals.evaluators import EvaluationReason, Evaluator, EvaluatorContext

from evals.worlds.repo_bootstrap.models import (
    RepoBootstrapEvalInput,
    RepoBootstrapEvalOutput,
)


@dataclass
class EvaluationResultLinkedToExperiment(
    Evaluator[RepoBootstrapEvalInput, RepoBootstrapEvalOutput, Any]
):
    def evaluate(
        self,
        ctx: EvaluatorContext[RepoBootstrapEvalInput, RepoBootstrapEvalOutput, Any],
    ) -> EvaluationReason:
        evaluations = ctx.output.project_overview.get("evaluations", [])
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
