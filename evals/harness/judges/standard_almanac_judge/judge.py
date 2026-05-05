from __future__ import annotations

import os
from dataclasses import dataclass, field

from pydantic_ai import ModelSettings
from pydantic_evals.evaluators import LLMJudge


def _default_judge_model() -> str:
    return os.environ.get("ALMANAC_EVAL_JUDGE_MODEL", "openai:gpt-5.5")


@dataclass
class StandardAlmanacJudge(LLMJudge):
    """Standard LLM judge wrapper for semantic Almanac evals."""

    include_input: bool = True
    model: object = field(default_factory=_default_judge_model)
    model_settings: object = field(default_factory=lambda: ModelSettings(temperature=0.0))
