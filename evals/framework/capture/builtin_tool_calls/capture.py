from __future__ import annotations

from collections.abc import Mapping
from typing import Any

from evals.framework.models import CapturedToolCall


def captured_builtin_tool_calls_from_result(result: Any) -> list[CapturedToolCall]:
    """Extract provider-native builtin tool calls from a Pydantic AI run result."""
    captured: list[CapturedToolCall] = []
    for message in result.all_messages():
        builtin_tool_calls = getattr(message, "builtin_tool_calls", None)
        if builtin_tool_calls is None:
            continue
        for call_part, return_part in builtin_tool_calls:
            captured.append(
                CapturedToolCall(
                    tool_name=call_part.tool_name,
                    args=_tool_call_args(call_part),
                    result=_tool_return_result(return_part),
                )
            )
    return captured


def _tool_call_args(call_part: Any) -> dict[str, Any]:
    args_as_dict = getattr(call_part, "args_as_dict", None)
    if callable(args_as_dict):
        return args_as_dict()
    args = getattr(call_part, "args", None)
    if isinstance(args, dict):
        return dict(args)
    if isinstance(args, Mapping):
        return dict(args)
    return {}


def _tool_return_result(return_part: Any) -> dict[str, Any]:
    content = getattr(return_part, "content", None)
    if isinstance(content, dict):
        result = dict(content)
    elif isinstance(content, Mapping):
        result = dict(content)
    elif content is None:
        result = {}
    else:
        result = {"value": content}

    provider_name = getattr(return_part, "provider_name", None)
    if provider_name is not None:
        result.setdefault("provider_name", provider_name)
    tool_call_id = getattr(return_part, "tool_call_id", None)
    if tool_call_id is not None:
        result.setdefault("tool_call_id", tool_call_id)
    return result
