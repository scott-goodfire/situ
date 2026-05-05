from __future__ import annotations

from dataclasses import dataclass
from typing import Any

from pydantic_evals.evaluators import EvaluationReason, Evaluator, EvaluatorContext

from evals.harness.models import SituEvalOutput


@dataclass
class ContentContains(Evaluator[Any, SituEvalOutput, Any]):
    text: str

    def evaluate(self, ctx: EvaluatorContext[Any, SituEvalOutput, Any]) -> EvaluationReason:
        content = ctx.output.content.lower()
        needle = self.text.lower()
        if needle in content:
            return EvaluationReason(value=True, reason=f"Output contains {self.text!r}")
        return EvaluationReason(value=False, reason=f"Output did not contain {self.text!r}: {ctx.output.content}")
