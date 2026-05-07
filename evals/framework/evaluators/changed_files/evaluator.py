from __future__ import annotations

from dataclasses import dataclass
from typing import Any

from pydantic_evals.evaluators import EvaluationReason, Evaluator, EvaluatorContext


@dataclass
class ChangedFilesDoNotInclude(Evaluator[Any, Any, Any]):
    path: str

    def evaluate(self, ctx: EvaluatorContext[Any, Any, Any]) -> EvaluationReason:
        changed_files = list(getattr(ctx.output, "changed_files", []))
        if self.path not in changed_files:
            return EvaluationReason(
                value=True,
                reason=f"{self.path} was unchanged",
            )
        return EvaluationReason(
            value=False,
            reason=f"{self.path} changed; changed files: {changed_files}",
        )


@dataclass
class ChangedFilesExactly(Evaluator[Any, Any, Any]):
    paths: tuple[str, ...]

    def __init__(self, *paths: str) -> None:
        self.paths = tuple(paths)

    def evaluate(self, ctx: EvaluatorContext[Any, Any, Any]) -> EvaluationReason:
        expected = sorted(self.paths)
        changed = sorted(getattr(ctx.output, "changed_files", []))
        if changed == expected:
            return EvaluationReason(
                value=True,
                reason=f"Changed files matched {expected}",
            )
        return EvaluationReason(
            value=False,
            reason=f"Expected changed files {expected}; got {changed}",
        )
