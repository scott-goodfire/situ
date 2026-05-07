from __future__ import annotations

from dataclasses import dataclass
from typing import Any

from pydantic_evals.evaluators import EvaluationReason, Evaluator, EvaluatorContext

from evals.framework.evaluators.helpers import warnings
from evals.framework.models import SituEvalOutput


@dataclass
class WarningWasCreated(Evaluator[Any, SituEvalOutput, Any]):
    kind: str

    def evaluate(self, ctx: EvaluatorContext[Any, SituEvalOutput, Any]) -> EvaluationReason:
        kinds = [warning.kind for warning in warnings(ctx.output)]
        if self.kind in kinds:
            return EvaluationReason(value=True, reason=f"Warning created: {self.kind}")
        return EvaluationReason(value=False, reason=f"Missing warning {self.kind}. Got {kinds}")
