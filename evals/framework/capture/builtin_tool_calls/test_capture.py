from __future__ import annotations

from pydantic_ai.messages import (
    BuiltinToolCallPart,
    BuiltinToolReturnPart,
    ModelResponse,
)

from evals.framework.capture import captured_builtin_tool_calls_from_result


class _Result:
    def all_messages(self):
        return [
            ModelResponse(
                parts=[
                    BuiltinToolCallPart(
                        tool_name="web_search",
                        args={"query": "bits per byte language modeling"},
                        tool_call_id="call_1",
                        provider_name="anthropic",
                    ),
                    BuiltinToolReturnPart(
                        tool_name="web_search",
                        tool_call_id="call_1",
                        content={
                            "status": "completed",
                            "sources": [{"url": "https://example.com"}],
                        },
                        provider_name="anthropic",
                    ),
                ],
            )
        ]


def test_captured_builtin_tool_calls_from_result() -> None:
    calls = captured_builtin_tool_calls_from_result(_Result())

    assert len(calls) == 1
    assert calls[0].tool_name == "web_search"
    assert calls[0].args == {"query": "bits per byte language modeling"}
    assert calls[0].result["status"] == "completed"
    assert calls[0].result["sources"] == [{"url": "https://example.com"}]
    assert calls[0].result["provider_name"] == "anthropic"
    assert calls[0].result["tool_call_id"] == "call_1"
