from __future__ import annotations

import json
from dataclasses import dataclass
from typing import Any

from pydantic_evals.evaluators import EvaluationReason, Evaluator, EvaluatorContext


@dataclass
class ProjectOverviewContains(Evaluator[Any, Any, Any]):
    text: str

    def evaluate(self, ctx: EvaluatorContext[Any, Any, Any]) -> EvaluationReason:
        project_overview = getattr(ctx.output, "project_overview", {})
        rendered = json.dumps(project_overview, sort_keys=True).lower()
        needle = self.text.lower()
        if needle in rendered:
            return EvaluationReason(
                value=True,
                reason=f"Project overview contains {self.text!r}",
            )
        return EvaluationReason(
            value=False,
            reason=f"Project overview did not contain {self.text!r}",
        )
