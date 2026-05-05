from __future__ import annotations

from dataclasses import dataclass, field

from pydantic_evals.evaluators import LLMJudge

from evals.harness.llms import eval_model_name


@dataclass
class StandardAlmanacJudge(LLMJudge):
    """Standard LLM judge wrapper for semantic Almanac evals."""

    include_input: bool = True
    model: object = field(default_factory=eval_model_name)
