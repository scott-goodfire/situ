from __future__ import annotations

from dataclasses import dataclass
from typing import Any

from pydantic_evals.evaluators import EvaluationReason, Evaluator, EvaluatorContext

from evals.harness.evaluators.helpers import events
from evals.harness.models import AlmanacEvalOutput


@dataclass
class EventWasEmitted(Evaluator[Any, AlmanacEvalOutput, Any]):
    event_type: str

    def evaluate(self, ctx: EvaluatorContext[Any, AlmanacEvalOutput, Any]) -> EvaluationReason:
        event_types = [event.event_type for event in events(ctx.output)]
        if self.event_type in event_types:
            return EvaluationReason(value=True, reason=f"Event emitted: {self.event_type}")
        return EvaluationReason(value=False, reason=f"Missing event {self.event_type}. Got {event_types}")
