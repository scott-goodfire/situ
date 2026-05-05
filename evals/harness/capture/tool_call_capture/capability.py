from __future__ import annotations

from collections.abc import Mapping
from typing import Any

from pydantic_ai import RunContext
from pydantic_ai.capabilities.abstract import AbstractCapability, ValidatedToolArgs
from pydantic_ai.messages import ToolCallPart, ToolReturn
from pydantic_ai.tools import ToolDefinition

from evals.harness.models import CapturedToolCall


class ToolCallCaptureCapability(AbstractCapability[Any]):
    """Capture Pydantic AI tool calls in the same envelope used by eval outputs."""

    def __init__(self) -> None:
        self.tool_calls: list[CapturedToolCall] = []

    def reset(self) -> None:
        self.tool_calls.clear()

    def get_tool_calls(self, tool_name: str) -> list[CapturedToolCall]:
        return [call for call in self.tool_calls if call.tool_name == tool_name]

    async def after_tool_execute(
        self,
        ctx: RunContext[Any],
        *,
        call: ToolCallPart,
        tool_def: ToolDefinition,
        args: ValidatedToolArgs,
        result: Any,
    ) -> Any:
        self.tool_calls.append(
            CapturedToolCall(
                tool_name=call.tool_name,
                args=_validated_tool_args_as_dict(args, call=call),
                result=_tool_result_as_dict(result),
            )
        )
        return result


def _validated_tool_args_as_dict(args: Any, *, call: ToolCallPart) -> dict[str, Any]:
    if args is None:
        plain: dict[str, Any] = {}
    elif isinstance(args, dict):
        plain = dict(args)
    elif isinstance(args, Mapping):
        plain = dict(args)
    else:
        plain = {}

    if not plain and call.has_content():
        return call.args_as_dict()
    return plain


def _tool_result_as_dict(result: Any) -> dict[str, Any]:
    value = result.return_value if isinstance(result, ToolReturn) else result
    if isinstance(value, dict):
        return dict(value)
    if hasattr(value, "model_dump"):
        return value.model_dump()
    if value is None:
        return {}
    return {"value": value}
