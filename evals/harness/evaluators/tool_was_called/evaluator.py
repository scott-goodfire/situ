from __future__ import annotations

from dataclasses import dataclass
from typing import Any

from pydantic_evals.evaluators import EvaluationReason, Evaluator, EvaluatorContext

from evals.harness.evaluators.helpers import tool_calls
from evals.harness.models import SituEvalOutput


@dataclass
class ToolWasCalled(Evaluator[Any, SituEvalOutput, Any]):
    tool_name: str
    expected: bool = True

    def evaluate(self, ctx: EvaluatorContext[Any, SituEvalOutput, Any]) -> EvaluationReason:
        matches = [call for call in tool_calls(ctx.output) if call.tool_name == self.tool_name]
        found = bool(matches)
        if found == self.expected:
            reason = f"{self.tool_name} called {len(matches)} time(s)" if found else f"{self.tool_name} not called"
            return EvaluationReason(value=True, reason=reason)
        if self.expected:
            return EvaluationReason(value=False, reason=f"Expected {self.tool_name} to be called")
        return EvaluationReason(value=False, reason=f"Expected {self.tool_name} not to be called")
