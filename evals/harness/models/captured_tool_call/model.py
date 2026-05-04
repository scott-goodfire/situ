from __future__ import annotations

from typing import Any

from pydantic import Field

from evals.harness.models.eval_model.model import EvalModel


class CapturedToolCall(EvalModel):
    tool_name: str
    args: dict[str, Any] = Field(default_factory=dict)
    result: dict[str, Any] = Field(default_factory=dict)
