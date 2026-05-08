from __future__ import annotations

from typing import Any

from pydantic_ai.capabilities.abstract import AbstractCapability
from pydantic_ai.models.anthropic import AnthropicCompaction

from ...config import DEFAULTS


SITU_COMPACTION_INSTRUCTIONS = (
    "Preserve Situ research trajectory memory. Keep the objective, research "
    "context, baseline and incumbent status, important record IDs, accepted "
    "and rejected evidence, unresolved questions, active lineage, and pending "
    "tasks. Do not treat the summary as the source of truth; future agent "
    "passes must still read current Situ project and task records through "
    "tools."
)


def build_model_capabilities(model: object) -> list[AbstractCapability[Any]]:
    if not _is_anthropic_model(model):
        return []
    return [
        AnthropicCompaction(
            token_threshold=DEFAULTS.anthropic_compaction_token_threshold,
            instructions=SITU_COMPACTION_INSTRUCTIONS,
        )
    ]


def _is_anthropic_model(model: object) -> bool:
    if isinstance(model, str):
        return model.startswith("anthropic:")
    system = getattr(model, "system", None)
    return system == "anthropic"
