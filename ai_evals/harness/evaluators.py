from __future__ import annotations

import json
from dataclasses import dataclass
from typing import Any

from pydantic_evals.evaluators import EvaluationReason, Evaluator, EvaluatorContext

from .models import AlmanacEvalOutput, CapturedToolCall


def _tool_calls(output: Any) -> list[CapturedToolCall]:
    return list(getattr(output, "captured_tool_calls", []))


def _events(output: Any) -> list[Any]:
    return list(getattr(output, "events", []))


def _warnings(output: Any) -> list[Any]:
    return list(getattr(output, "warnings", []))


def _findings(output: Any) -> list[Any]:
    return list(getattr(output, "findings", []))


@dataclass
class ContentContains(Evaluator[Any, AlmanacEvalOutput, Any]):
    text: str

    def evaluate(self, ctx: EvaluatorContext[Any, AlmanacEvalOutput, Any]) -> EvaluationReason:
        content = ctx.output.content.lower()
        needle = self.text.lower()
        if needle in content:
            return EvaluationReason(value=True, reason=f"Output contains {self.text!r}")
        return EvaluationReason(value=False, reason=f"Output did not contain {self.text!r}: {ctx.output.content}")


@dataclass
class ToolWasCalled(Evaluator[Any, AlmanacEvalOutput, Any]):
    tool_name: str
    expected: bool = True

    def evaluate(self, ctx: EvaluatorContext[Any, AlmanacEvalOutput, Any]) -> EvaluationReason:
        matches = [call for call in _tool_calls(ctx.output) if call.tool_name == self.tool_name]
        found = bool(matches)
        if found == self.expected:
            reason = f"{self.tool_name} called {len(matches)} time(s)" if found else f"{self.tool_name} not called"
            return EvaluationReason(value=True, reason=reason)
        if self.expected:
            return EvaluationReason(value=False, reason=f"Expected {self.tool_name} to be called")
        return EvaluationReason(value=False, reason=f"Expected {self.tool_name} not to be called")


@dataclass
class ToolArgsContain(Evaluator[Any, AlmanacEvalOutput, Any]):
    tool_name: str
    text: str

    def evaluate(self, ctx: EvaluatorContext[Any, AlmanacEvalOutput, Any]) -> EvaluationReason:
        matches = [call for call in _tool_calls(ctx.output) if call.tool_name == self.tool_name]
        needle = self.text.lower()
        for call in matches:
            rendered = json.dumps(call.args, sort_keys=True).lower()
            if needle in rendered:
                return EvaluationReason(value=True, reason=f"{self.tool_name} args contain {self.text!r}")
        return EvaluationReason(
            value=False,
            reason=f"{self.tool_name} args did not contain {self.text!r}: {[call.args for call in matches]}",
        )


@dataclass
class ToolCallOrder(Evaluator[Any, AlmanacEvalOutput, Any]):
    before: str
    after: str

    def evaluate(self, ctx: EvaluatorContext[Any, AlmanacEvalOutput, Any]) -> EvaluationReason:
        names = [call.tool_name for call in _tool_calls(ctx.output)]
        try:
            before_idx = names.index(self.before)
        except ValueError:
            return EvaluationReason(value=False, reason=f"{self.before} was not called. Got {names}")
        try:
            after_idx = names.index(self.after)
        except ValueError:
            return EvaluationReason(value=False, reason=f"{self.after} was not called. Got {names}")
        if before_idx < after_idx:
            return EvaluationReason(value=True, reason=f"{self.before} happened before {self.after}")
        return EvaluationReason(value=False, reason=f"Expected {self.before} before {self.after}. Got {names}")


@dataclass
class EventWasEmitted(Evaluator[Any, AlmanacEvalOutput, Any]):
    event_type: str

    def evaluate(self, ctx: EvaluatorContext[Any, AlmanacEvalOutput, Any]) -> EvaluationReason:
        event_types = [event.event_type for event in _events(ctx.output)]
        if self.event_type in event_types:
            return EvaluationReason(value=True, reason=f"Event emitted: {self.event_type}")
        return EvaluationReason(value=False, reason=f"Missing event {self.event_type}. Got {event_types}")


@dataclass
class WarningWasCreated(Evaluator[Any, AlmanacEvalOutput, Any]):
    kind: str

    def evaluate(self, ctx: EvaluatorContext[Any, AlmanacEvalOutput, Any]) -> EvaluationReason:
        kinds = [warning.kind for warning in _warnings(ctx.output)]
        if self.kind in kinds:
            return EvaluationReason(value=True, reason=f"Warning created: {self.kind}")
        return EvaluationReason(value=False, reason=f"Missing warning {self.kind}. Got {kinds}")


@dataclass
class FindingContains(Evaluator[Any, AlmanacEvalOutput, Any]):
    text: str

    def evaluate(self, ctx: EvaluatorContext[Any, AlmanacEvalOutput, Any]) -> EvaluationReason:
        needle = self.text.lower()
        contents = [finding.content for finding in _findings(ctx.output)]
        for content in contents:
            if needle in content.lower():
                return EvaluationReason(value=True, reason=f"Finding contains {self.text!r}")
        return EvaluationReason(value=False, reason=f"No finding contained {self.text!r}. Got {contents}")

