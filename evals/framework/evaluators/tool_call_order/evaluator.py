from __future__ import annotations

from dataclasses import dataclass
from typing import Any

from pydantic_evals.evaluators import EvaluationReason, Evaluator, EvaluatorContext

from evals.framework.evaluators.helpers import tool_calls
from evals.framework.models import SituEvalOutput


@dataclass
class ToolCallOrder(Evaluator[Any, SituEvalOutput, Any]):
    before: str
    after: str

    def evaluate(self, ctx: EvaluatorContext[Any, SituEvalOutput, Any]) -> EvaluationReason:
        names = [call.tool_name for call in tool_calls(ctx.output)]
        try:
            before_idx = names.index(self.before)
        except ValueError:
            return EvaluationReason(value=False, reason=f"{self.before} was not called. Got {names}")
        try:
            after_idx = names.index(self.after)
        except ValueError:
            return EvaluationReason(value=False, reason=f"{self.after} was not called. Got {names}")
        if before_idx < after_idx:
            return EvaluationReason(value=True, reason=f"{self.before} happened before {self.after}")
        return EvaluationReason(value=False, reason=f"Expected {self.before} before {self.after}. Got {names}")
