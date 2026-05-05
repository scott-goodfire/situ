from __future__ import annotations

import json
from dataclasses import dataclass
from typing import Any

from pydantic_evals.evaluators import EvaluationReason, Evaluator, EvaluatorContext

from evals.harness.evaluators.helpers import tool_calls
from evals.harness.models import SituEvalOutput


@dataclass
class ToolArgsContain(Evaluator[Any, SituEvalOutput, Any]):
    tool_name: str
    text: str

    def evaluate(self, ctx: EvaluatorContext[Any, SituEvalOutput, Any]) -> EvaluationReason:
        matches = [call for call in tool_calls(ctx.output) if call.tool_name == self.tool_name]
        needle = self.text.lower()
        for call in matches:
            rendered = json.dumps(call.args, sort_keys=True).lower()
            if needle in rendered:
                return EvaluationReason(value=True, reason=f"{self.tool_name} args contain {self.text!r}")
        return EvaluationReason(
            value=False,
            reason=f"{self.tool_name} args did not contain {self.text!r}: {[call.args for call in matches]}",
        )
