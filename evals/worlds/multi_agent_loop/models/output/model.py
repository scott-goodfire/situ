from __future__ import annotations

from typing import Any

from pydantic import Field

from evals.framework.models import CapturedToolCall, SituEvalOutput


class MultiAgentLoopEvalOutput(SituEvalOutput):
    manager_outputs: list[dict[str, Any]] = Field(default_factory=list)
    researcher_outputs: list[dict[str, Any]] = Field(default_factory=list)
    scientist_outputs: list[dict[str, Any]] = Field(default_factory=list)
    manager_tool_calls: list[CapturedToolCall] = Field(default_factory=list)
    researcher_tool_calls: list[CapturedToolCall] = Field(default_factory=list)
    scientist_tool_calls: list[CapturedToolCall] = Field(default_factory=list)
    final_manager_tool_calls: list[CapturedToolCall] = Field(default_factory=list)
    project_board: dict[str, Any] = Field(default_factory=dict)
    workspace_files: dict[str, str] = Field(default_factory=dict)
    changed_files: list[str] = Field(default_factory=list)
