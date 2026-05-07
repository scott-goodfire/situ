from __future__ import annotations

from dataclasses import dataclass
from typing import Any

from pydantic_evals.evaluators import EvaluationReason, Evaluator, EvaluatorContext

from evals.framework.evaluators.helpers import tool_calls


@dataclass
class ToolSucceeded(Evaluator[Any, Any, Any]):
    tool_name: str

    def evaluate(self, ctx: EvaluatorContext[Any, Any, Any]) -> EvaluationReason:
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
