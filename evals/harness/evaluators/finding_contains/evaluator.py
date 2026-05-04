from __future__ import annotations

from dataclasses import dataclass
from typing import Any

from pydantic_evals.evaluators import EvaluationReason, Evaluator, EvaluatorContext

from evals.harness.evaluators.helpers import findings
from evals.harness.models import AlmanacEvalOutput


@dataclass
class FindingContains(Evaluator[Any, AlmanacEvalOutput, Any]):
    text: str

    def evaluate(self, ctx: EvaluatorContext[Any, AlmanacEvalOutput, Any]) -> EvaluationReason:
        needle = self.text.lower()
        contents = [finding.content for finding in findings(ctx.output)]
        for content in contents:
            if needle in content.lower():
                return EvaluationReason(value=True, reason=f"Finding contains {self.text!r}")
        return EvaluationReason(value=False, reason=f"No finding contained {self.text!r}. Got {contents}")
