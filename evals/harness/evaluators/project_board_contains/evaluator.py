from __future__ import annotations

import json
from dataclasses import dataclass
from typing import Any

from pydantic_evals.evaluators import EvaluationReason, Evaluator, EvaluatorContext


@dataclass
class ProjectBoardContains(Evaluator[Any, Any, Any]):
    text: str

    def evaluate(self, ctx: EvaluatorContext[Any, Any, Any]) -> EvaluationReason:
        project_board = getattr(ctx.output, "project_board", {})
        rendered = json.dumps(project_board, sort_keys=True).lower()
        needle = self.text.lower()
        if needle in rendered:
            return EvaluationReason(
                value=True,
                reason=f"Project board contains {self.text!r}",
            )
        return EvaluationReason(
            value=False,
            reason=f"Project board did not contain {self.text!r}",
        )
