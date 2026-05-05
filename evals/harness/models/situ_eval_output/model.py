from __future__ import annotations

from pydantic import Field

from evals.harness.models.captured_tool_call.model import CapturedToolCall
from evals.harness.models.eval_event.model import EvalEvent
from evals.harness.models.eval_finding.model import EvalFinding
from evals.harness.models.eval_model.model import EvalModel
from evals.harness.models.eval_warning.model import EvalWarning


class SituEvalOutput(EvalModel):
    content: str
    captured_tool_calls: list[CapturedToolCall] = Field(default_factory=list)
    events: list[EvalEvent] = Field(default_factory=list)
    warnings: list[EvalWarning] = Field(default_factory=list)
    findings: list[EvalFinding] = Field(default_factory=list)
    signals: dict[str, int | float | str | bool | None] = Field(default_factory=dict)
