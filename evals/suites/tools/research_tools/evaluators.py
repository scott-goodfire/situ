from __future__ import annotations

from dataclasses import dataclass
import json
from typing import Any

from pydantic_evals.evaluators import EvaluationReason, Evaluator, EvaluatorContext

from evals.worlds.research_session.models import (
    ResearchToolEvalInput,
    ResearchToolEvalOutput,
)


@dataclass
class ProjectOverviewHasLink(
    Evaluator[ResearchToolEvalInput, ResearchToolEvalOutput, Any]
):
    hypothesis_id: str
    experiment_id: str

    def evaluate(
        self,
        ctx: EvaluatorContext[ResearchToolEvalInput, ResearchToolEvalOutput, Any],
    ) -> EvaluationReason:
        links = ctx.output.project_overview.get("hypothesis_experiment_links", [])
        for link in links:
            if (
                link.get("hypothesis_id") == self.hypothesis_id
                and link.get("experiment_id") == self.experiment_id
            ):
                return EvaluationReason(
                    value=True,
                    reason=(
                        "Project overview links "
                        f"{self.hypothesis_id} to {self.experiment_id}"
                    ),
                )
        return EvaluationReason(
            value=False,
            reason=(
                "Project overview did not link "
                f"{self.hypothesis_id} to {self.experiment_id}"
            ),
        )


@dataclass
class ProjectOverviewSummaryHasFields(
    Evaluator[ResearchToolEvalInput, ResearchToolEvalOutput, Any]
):
    fields: list[str]
    expected_values: dict[str, Any] | None = None

    def evaluate(
        self,
        ctx: EvaluatorContext[ResearchToolEvalInput, ResearchToolEvalOutput, Any],
    ) -> EvaluationReason:
        summary = ctx.output.project_overview.get("summary")
        if not isinstance(summary, dict):
            return EvaluationReason(
                value=False,
                reason="Project overview has no structured summary object.",
            )

        missing = [
            field for field in self.fields if _get_path(summary=summary, path=field) is _MISSING
        ]
        mismatches: dict[str, dict[str, Any]] = {}
        for path, expected in (self.expected_values or {}).items():
            actual = _get_path(summary=summary, path=path)
            if actual != expected:
                mismatches[path] = {"expected": expected, "actual": actual}

        if missing or mismatches:
            return EvaluationReason(
                value=False,
                reason=(
                    "Project overview summary mismatch. "
                    f"Missing: {missing}. Mismatches: {json.dumps(mismatches, sort_keys=True)}. "
                    f"Summary: {json.dumps(summary, sort_keys=True)}"
                ),
            )
        return EvaluationReason(
            value=True,
            reason="Project overview summary contains the expected fields and values.",
        )


_MISSING = object()


def _get_path(
    *,
    summary: dict[str, Any],
    path: str,
) -> Any:
    current: Any = summary
    for part in path.split("."):
        if not isinstance(current, dict) or part not in current:
            return _MISSING
        current = current[part]
    return current
