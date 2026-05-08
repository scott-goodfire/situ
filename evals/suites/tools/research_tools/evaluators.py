from __future__ import annotations

from dataclasses import dataclass
from typing import Any

from pydantic_evals.evaluators import EvaluationReason, Evaluator, EvaluatorContext

from evals.worlds.research_session.models import (
    ResearchToolEvalInput,
    ResearchToolEvalOutput,
)


@dataclass
class ProjectOverviewHasLink(
    Evaluator[ResearchToolEvalInput, ResearchToolEvalOutput, Any]
):
    hypothesis_id: str
    experiment_id: str

    def evaluate(
        self,
        ctx: EvaluatorContext[ResearchToolEvalInput, ResearchToolEvalOutput, Any],
    ) -> EvaluationReason:
        links = ctx.output.project_overview.get("hypothesis_experiment_links", [])
        for link in links:
            if (
                link.get("hypothesis_id") == self.hypothesis_id
                and link.get("experiment_id") == self.experiment_id
            ):
                return EvaluationReason(
                    value=True,
                    reason=(
                        "Project overview links "
                        f"{self.hypothesis_id} to {self.experiment_id}"
                    ),
                )
        return EvaluationReason(
            value=False,
            reason=(
                "Project overview did not link "
                f"{self.hypothesis_id} to {self.experiment_id}"
            ),
        )
