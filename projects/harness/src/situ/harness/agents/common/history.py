from __future__ import annotations

from pydantic_ai.messages import CompactionPart, ModelMessage, ModelResponse


def keep_last_compaction_history(messages: list[ModelMessage]) -> list[ModelMessage]:
    """Keep compacted history plus the turns after it.

    Anthropic compaction returns a `CompactionPart` that stands in for older
    context. Keeping the pre-compaction turns as well would make every replay
    grow without bound and ask Anthropic to compact the same turns again.
    """
    last_compaction_index: int | None = None
    for index, message in enumerate(messages):
        if isinstance(message, ModelResponse) and any(
            isinstance(part, CompactionPart)
            and (part.provider_name is None or part.provider_name == "anthropic")
            for part in message.parts
        ):
            last_compaction_index = index

    if last_compaction_index is None:
        return messages
    return messages[last_compaction_index:]
