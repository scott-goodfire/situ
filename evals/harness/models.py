from __future__ import annotations

from typing import Any

from pydantic import BaseModel, ConfigDict, Field


class EvalModel(BaseModel):
    model_config = ConfigDict(extra="forbid")


class CapturedToolCall(EvalModel):
    tool_name: str
    args: dict[str, Any] = Field(default_factory=dict)
    result: dict[str, Any] = Field(default_factory=dict)


class EvalEvent(EvalModel):
    event_type: str
    message: str
    payload: dict[str, Any] = Field(default_factory=dict)


class EvalWarning(EvalModel):
    kind: str
    message: str
    experiment_id: str | None = None


class EvalFinding(EvalModel):
    content: str
    evidence_ids: list[str] = Field(default_factory=list)


class AlmanacEvalOutput(EvalModel):
    content: str
    captured_tool_calls: list[CapturedToolCall] = Field(default_factory=list)
    events: list[EvalEvent] = Field(default_factory=list)
    warnings: list[EvalWarning] = Field(default_factory=list)
    findings: list[EvalFinding] = Field(default_factory=list)
    signals: dict[str, int | float | str | bool | None] = Field(default_factory=dict)

