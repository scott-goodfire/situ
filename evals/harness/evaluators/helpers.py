from __future__ import annotations

from typing import Any

from evals.harness.models import CapturedToolCall


def tool_calls(output: Any) -> list[CapturedToolCall]:
    return list(getattr(output, "captured_tool_calls", []))


def events(output: Any) -> list[Any]:
    return list(getattr(output, "events", []))


def warnings(output: Any) -> list[Any]:
    return list(getattr(output, "warnings", []))


def findings(output: Any) -> list[Any]:
    return list(getattr(output, "findings", []))
