from __future__ import annotations

import json
from dataclasses import dataclass
from typing import Any

from pydantic_evals.evaluators import EvaluationReason, Evaluator, EvaluatorContext

from evals.harness.evaluators.helpers import tool_calls
from evals.worlds.research_session.models import (
    ResearchToolEvalInput,
    ResearchToolEvalOutput,
)


@dataclass
class ToolSucceeded(
    Evaluator[ResearchToolEvalInput, ResearchToolEvalOutput, Any]
):
    tool_name: str

    def evaluate(
        self,
        ctx: EvaluatorContext[ResearchToolEvalInput, ResearchToolEvalOutput, Any],
    ) -> EvaluationReason:
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


@dataclass
class SessionGraphContains(
    Evaluator[ResearchToolEvalInput, ResearchToolEvalOutput, Any]
):
    text: str

    def evaluate(
        self,
        ctx: EvaluatorContext[ResearchToolEvalInput, ResearchToolEvalOutput, Any],
    ) -> EvaluationReason:
        rendered = json.dumps(ctx.output.session_graph, sort_keys=True).lower()
        needle = self.text.lower()
        if needle in rendered:
            return EvaluationReason(
                value=True,
                reason=f"Session graph contains {self.text!r}",
            )
        return EvaluationReason(
            value=False,
            reason=f"Session graph did not contain {self.text!r}",
        )


@dataclass
class SessionGraphHasLink(
    Evaluator[ResearchToolEvalInput, ResearchToolEvalOutput, Any]
):
    hypothesis_id: str
    experiment_id: str

    def evaluate(
        self,
        ctx: EvaluatorContext[ResearchToolEvalInput, ResearchToolEvalOutput, Any],
    ) -> EvaluationReason:
        links = ctx.output.session_graph.get("hypothesis_experiment_links", [])
        for link in links:
            if (
                link.get("hypothesis_id") == self.hypothesis_id
                and link.get("experiment_id") == self.experiment_id
            ):
                return EvaluationReason(
                    value=True,
                    reason=(
                        "Session graph links "
                        f"{self.hypothesis_id} to {self.experiment_id}"
                    ),
                )
        return EvaluationReason(
            value=False,
            reason=(
                "Session graph did not link "
                f"{self.hypothesis_id} to {self.experiment_id}"
            ),
        )
